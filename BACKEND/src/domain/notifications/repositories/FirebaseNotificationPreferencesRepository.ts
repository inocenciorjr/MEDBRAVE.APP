import { injectable } from 'tsyringe';
import { firestore } from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import { INotificationPreferencesRepository } from '../interfaces/INotificationPreferencesRepository';
import { NotificationPreferences } from '../types';

@injectable()
export class FirebaseNotificationPreferencesRepository
implements INotificationPreferencesRepository {
  private db: firestore.Firestore;
  private collectionRef: firestore.CollectionReference;
  private readonly COLLECTION_NAME = 'notification_preferences';

  constructor() {
    this.db = getFirestore();
    this.collectionRef = this.db.collection(this.COLLECTION_NAME);
  }

  async savePreferences(preferences: NotificationPreferences): Promise<NotificationPreferences> {
    const { id } = preferences;
    const now = new Date();

    const preferencesToSave = {
      ...preferences,
      updatedAt: now,
    };

    if (!id || id === '') {
      // Criar novas preferências
      const docRef = this.collectionRef.doc();
      preferencesToSave.id = docRef.id;
      preferencesToSave.createdAt = now;

      await docRef.set(this.toFirestore(preferencesToSave));
    } else {
      // Atualizar preferências existentes
      await this.collectionRef.doc(id).update(this.toFirestore(preferencesToSave));
    }

    return preferencesToSave;
  }

  async getPreferencesByUserId(userId: string): Promise<NotificationPreferences | null> {
    const snapshot = await this.collectionRef.where('userId', '==', userId).limit(1).get();

    if (snapshot.empty) {
      return null;
    }

    return this.fromFirestore(snapshot.docs[0]);
  }

  async deletePreferences(userId: string): Promise<void> {
    const snapshot = await this.collectionRef.where('userId', '==', userId).get();

    if (snapshot.empty) {
      return;
    }

    const batch = this.db.batch();
    snapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });

    await batch.commit();
  }

  async hasPreferences(userId: string): Promise<boolean> {
    const preferences = await this.getPreferencesByUserId(userId);
    return preferences !== null;
  }

  // Métodos auxiliares de conversão

  private toFirestore(preferences: NotificationPreferences): any {
    return {
      ...preferences,
      createdAt: firestore.Timestamp.fromDate(preferences.createdAt),
      updatedAt: firestore.Timestamp.fromDate(preferences.updatedAt),
    };
  }

  private fromFirestore(doc: firestore.DocumentSnapshot): NotificationPreferences {
    const data = doc.data() as any;

    return {
      id: doc.id,
      userId: data.userId,
      channels: data.channels,
      types: data.types,
      doNotDisturb: data.doNotDisturb,
      createdAt: data.createdAt.toDate(),
      updatedAt: data.updatedAt.toDate(),
    };
  }
}
