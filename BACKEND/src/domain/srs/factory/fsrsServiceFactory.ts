import { firestore } from 'firebase-admin';
import { FSRSService } from '../services/FSRSService';
import { IFSRSService } from '../interfaces/IFSRSService';

export class FSRSServiceFactory {
  static createService(firebaseFirestore: firestore.Firestore): IFSRSService {
    return new FSRSService(firebaseFirestore);
  }
} 