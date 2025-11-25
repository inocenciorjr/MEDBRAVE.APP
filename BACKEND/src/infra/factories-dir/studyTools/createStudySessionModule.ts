import { Router } from 'express';

export const createStudySessionModule = (): { studySessionRoutes: Router } => {
  const studySessionRoutes = Router();
  return { studySessionRoutes };
};

 
