import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { FirebaseScrypt } from 'firebase-scrypt';

// Carregar variáveis de ambiente
dotenv.config();

// Configurações do Firebase
interface FirebaseConfig {
  memCost: number;
  rounds: number;
  saltSeparator: string;
  signerKey: string;
}

// Configurações do Supabase
interface SupabaseConfig {
  url: string;
  serviceKey: string;
}

class FirebasePasswordMigration {
  private firebaseScrypt: any;
  private supabase: any;
  private firebaseConfig!: FirebaseConfig;
  private supabaseConfig!: SupabaseConfig;

  constructor() {
    this.loadConfigurations();
    this.initializeServices();
  }

  private loadConfigurations() {
    // Carregar configurações do Firebase
    this.firebaseConfig = {
      memCost: parseInt(process.env.FIREBASE_MEMCOST || '14'),
      rounds: parseInt(process.env.FIREBASE_ROUNDS || '8'),
      saltSeparator: process.env.FIREBASE_SALT_SEPARATOR || '',
      signerKey: process.env.FIREBASE_SIGNER_KEY || ''
    };

    // Carregar configurações do Supabase
    this.supabaseConfig = {
      url: process.env.SUPABASE_URL || '',
      serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    };

    if (!this.firebaseConfig.signerKey || !this.firebaseConfig.saltSeparator) {
      throw new Error('Firebase hash parameters not configured. Please set FIREBASE_SIGNER_KEY and FIREBASE_SALT_SEPARATOR environment variables.');
    }

    if (!this.supabaseConfig.url || !this.supabaseConfig.serviceKey) {
      throw new Error('Supabase configuration not found. Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables.');
    }
  }

  private initializeServices() {
    // Inicializar Firebase Scrypt
    this.firebaseScrypt = new FirebaseScrypt(this.firebaseConfig);

    // Inicializar Supabase
    this.supabase = createClient(this.supabaseConfig.url, this.supabaseConfig.serviceKey);
  }

  /**
   * Verifica se uma senha está correta usando o hash do Firebase
   */
  async verifyFirebasePassword(password: string, salt: string, hash: string): Promise<boolean> {
    try {
      return await this.firebaseScrypt.verify(password, salt, hash);
    } catch (error) {
      console.error('Error verifying Firebase password:', error);
      return false;
    }
  }

  /**
   * Atualiza a senha do usuário no Supabase
   */
  async updateSupabasePassword(userId: string, newPassword: string): Promise<boolean> {
    try {
      // Hash da nova senha usando bcrypt (padrão do Supabase)
      // const saltRounds = 12;
      // const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

      // Atualizar no Supabase Auth
      const { error } = await this.supabase.auth.admin.updateUserById(userId, {
        password: newPassword
      });

      if (error) {
        console.error('Error updating Supabase password:', error);
        return false;
      }

      // Marcar usuário como migrado
      await this.markUserAsMigrated(userId);
      
      return true;
    } catch (error) {
      console.error('Error updating password:', error);
      return false;
    }
  }

  /**
   * Marca o usuário como tendo a senha migrada
   */
  private async markUserAsMigrated(userId: string): Promise<void> {
    try {
      const { error } = await this.supabase.auth.admin.updateUserById(userId, {
        user_metadata: {
          password_migrated: true,
          migration_date: new Date().toISOString()
        }
      });

      if (error) {
        console.error('Error marking user as migrated:', error);
      }
    } catch (error) {
      console.error('Error in markUserAsMigrated:', error);
    }
  }

  /**
   * Verifica se o usuário já teve a senha migrada
   */
  async isPasswordMigrated(userId: string): Promise<boolean> {
    try {
      const { data: user, error } = await this.supabase.auth.admin.getUserById(userId);
      
      if (error || !user) {
        return false;
      }

      return user.user_metadata?.password_migrated === true;
    } catch (error) {
      console.error('Error checking migration status:', error);
      return false;
    }
  }

  /**
   * Obtém dados do Firebase do usuário
   */
  async getFirebaseUserData(userId: string): Promise<any> {
    try {
      const { data: user, error } = await this.supabase.auth.admin.getUserById(userId);
      
      if (error || !user) {
        return null;
      }

      return user.user_metadata?.fbuser || null;
    } catch (error) {
      console.error('Error getting Firebase user data:', error);
      return null;
    }
  }

  /**
   * Processo completo de migração de senha no primeiro login
   */
  async migratePasswordOnLogin(email: string, password: string): Promise<{
    success: boolean;
    userId?: string;
    message: string;
  }> {
    try {
      // Buscar usuário por email
      const { data: users, error: searchError } = await this.supabase.auth.admin.listUsers();
      
      if (searchError) {
        return { success: false, message: 'Error searching for user' };
      }

      const user = users.users.find((u: any) => u.email === email);
      
      if (!user) {
        return { success: false, message: 'User not found' };
      }

      // Verificar se já foi migrado
      if (await this.isPasswordMigrated(user.id)) {
        return { success: false, message: 'Password already migrated. Use normal login.' };
      }

      // Obter dados do Firebase
      const firebaseData = await this.getFirebaseUserData(user.id);
      
      if (!firebaseData || !firebaseData.passwordSalt || !firebaseData.passwordHash) {
        return { success: false, message: 'Firebase password data not found' };
      }

      // Verificar senha do Firebase
      const isValidPassword = await this.verifyFirebasePassword(
        password,
        firebaseData.passwordSalt,
        firebaseData.passwordHash
      );

      if (!isValidPassword) {
        return { success: false, message: 'Invalid password' };
      }

      // Atualizar senha no Supabase
      const updateSuccess = await this.updateSupabasePassword(user.id, password);
      
      if (!updateSuccess) {
        return { success: false, message: 'Failed to update password' };
      }

      return {
        success: true,
        userId: user.id,
        message: 'Password migrated successfully'
      };
    } catch (error) {
      console.error('Error in migratePasswordOnLogin:', error);
      return { success: false, message: 'Internal error during migration' };
    }
  }

  /**
   * Migração em lote de senhas (para usuários que já têm dados do Firebase)
   */
  async batchMigratePasswords(defaultPassword?: string): Promise<void> {
    try {
      console.log('Starting batch password migration...');
      
      const { data: users, error } = await this.supabase.auth.admin.listUsers();
      
      if (error) {
        throw new Error(`Error fetching users: ${error.message}`);
      }

      let migratedCount = 0;
      let skippedCount = 0;
      let errorCount = 0;

      for (const user of users.users) {
        try {
          // Pular se já foi migrado
          if (await this.isPasswordMigrated(user.id)) {
            skippedCount++;
            continue;
          }

          // Se não há senha padrão, apenas marcar como necessitando migração
          if (!defaultPassword) {
            await this.markUserAsNeedingMigration(user.id);
            continue;
          }

          // Definir senha padrão temporária
          const { error: updateError } = await this.supabase.auth.admin.updateUserById(user.id, {
            password: defaultPassword,
            user_metadata: {
              needs_password_reset: true,
              migration_date: new Date().toISOString()
            }
          });

          if (updateError) {
            console.error(`Error updating user ${user.id}:`, updateError);
            errorCount++;
          } else {
            migratedCount++;
            console.log(`Migrated user: ${user.email}`);
          }
        } catch (error) {
          console.error(`Error processing user ${user.id}:`, error);
          errorCount++;
        }
      }

      console.log(`\nBatch migration completed:`);
      console.log(`- Migrated: ${migratedCount}`);
      console.log(`- Skipped: ${skippedCount}`);
      console.log(`- Errors: ${errorCount}`);
    } catch (error) {
      console.error('Error in batch migration:', error);
      throw error;
    }
  }

  /**
   * Marca usuário como precisando de migração
   */
  private async markUserAsNeedingMigration(userId: string): Promise<void> {
    try {
      const { error } = await this.supabase.auth.admin.updateUserById(userId, {
        user_metadata: {
          needs_password_migration: true,
          migration_pending: true
        }
      });

      if (error) {
        console.error('Error marking user as needing migration:', error);
      }
    } catch (error) {
      console.error('Error in markUserAsNeedingMigration:', error);
    }
  }
}

export { FirebasePasswordMigration };

// CLI para execução direta
if (require.main === module) {
  const migration = new FirebasePasswordMigration();
  
  const command = process.argv[2];
  
  switch (command) {
    case 'batch-migrate':
      const defaultPassword = process.argv[3];
      migration.batchMigratePasswords(defaultPassword)
        .then(() => {
          console.log('Batch migration completed');
          process.exit(0);
        })
        .catch((error) => {
          console.error('Batch migration failed:', error);
          process.exit(1);
        });
      break;
      
    case 'test-login':
      const email = process.argv[3];
      const password = process.argv[4];
      
      if (!email || !password) {
        console.error('Usage: npm run migrate-passwords test-login <email> <password>');
        process.exit(1);
      }
      
      migration.migratePasswordOnLogin(email, password)
        .then((result) => {
          console.log('Migration result:', result);
          process.exit(result.success ? 0 : 1);
        })
        .catch((error) => {
          console.error('Test login failed:', error);
          process.exit(1);
        });
      break;
      
    default:
      console.log('Available commands:');
      console.log('  batch-migrate [default-password] - Migrate all users with optional default password');
      console.log('  test-login <email> <password> - Test migration for specific user');
      process.exit(1);
  }
}