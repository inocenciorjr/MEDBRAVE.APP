import { Result, Failure } from '../../../shared/types/Result';
import { User, UserRole } from '../entities/User';
import type { IUserRepository } from '../repositories/IUserRepository.ts';

export interface CreateUserDTO {
  email: string;
  password: string;
  name: string;
  role?: UserRole;
}

export class CreateUserUseCase {
  constructor(private userRepository: IUserRepository) {}

  async execute(data: CreateUserDTO): Promise<Result<User>> {
    try {
      // Verificar se já existe usuário com este email
      const existingUserResult = await this.userRepository.findByEmail(data.email);

      if (existingUserResult.isSuccess && existingUserResult.getValue()) {
        return Failure(new Error('Email já está em uso'));
      }

      // Criar nova entidade de usuário
      const userResult = User.create({
        id: crypto.randomUUID(), // Será substituído pelo ID do Firebase
        email: data.email,
        name: data.name,
        role: data.role || UserRole.STUDENT,
      });

      if (userResult.isFailure) {
        return userResult;
      }

      const user = userResult.getValue();

      // Persistir no repositório
      const createResult = await this.userRepository.create(user, data.password);

      if (createResult.isFailure) {
        return Failure(new Error('Erro ao criar usuário no repositório'));
      }

      return createResult;
    } catch (error) {
      return Failure(error instanceof Error ? error : new Error('Erro desconhecido ao criar usuário'));
    }
  }
}
