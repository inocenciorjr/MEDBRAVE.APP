import { Request, Response } from 'express';
import {
  IStudySessionRepository,
  StudySessionFilters,
  PaginationOptions,
} from '../repositories/IStudySessionRepository';
import { CreateStudySessionUseCase } from '../use-cases/CreateStudySessionUseCase';
import { GetStudySessionByIdUseCase } from '../use-cases/GetStudySessionByIdUseCase';
import { GetUserStudySessionsUseCase } from '../use-cases/GetUserStudySessionsUseCase';
import { UpdateStudySessionUseCase } from '../use-cases/UpdateStudySessionUseCase';
import { DeleteStudySessionUseCase } from '../use-cases/DeleteStudySessionUseCase';
import { CompleteStudySessionUseCase } from '../use-cases/CompleteStudySessionUseCase';
import { RecordStudySessionAnswerUseCase } from '../use-cases/RecordStudySessionAnswerUseCase';
import { validate } from '../validation/studySessionSchemas';
import { StudySessionType } from '../types/studySession.types';

export class StudySessionController {
  constructor(private readonly studySessionRepository: IStudySessionRepository) {}

  createStudySession = async (req: Request, res: Response): Promise<Response> => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Usuário não autenticado' });
      }
      const userId = req.user.id;
      const { error, value } = validate('createStudySession', req.body);
      if (error) {
        return res.status(400).json({ error: error.message });
      }

      const createStudySessionUseCase = new CreateStudySessionUseCase(this.studySessionRepository);
      const studySession = await createStudySessionUseCase.execute({
        ...value,
        userId,
      });

      return res.status(201).json(studySession);
    } catch (error) {
      const appError = error as { name?: string; statusCode?: number; message?: string };
      if (appError.name === 'AppError') {
        return res.status(appError.statusCode || 400).json({ error: appError.message });
      }
      return res.status(500).json({ error: 'Internal server error' });
    }
  };

  getSessionById = async (req: Request, res: Response): Promise<Response> => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Usuário não autenticado' });
      }
      const userId = req.user.id;
      const { id } = req.params;

      const getStudySessionByIdUseCase = new GetStudySessionByIdUseCase(
        this.studySessionRepository,
      );
      const studySession = await getStudySessionByIdUseCase.execute(id, userId);

      return res.status(200).json(studySession);
    } catch (error) {
      const appError = error as { name?: string; statusCode?: number; message?: string };
      if (appError.name === 'AppError') {
        return res.status(appError.statusCode || 400).json({ error: appError.message });
      }
      return res.status(500).json({ error: 'Internal server error' });
    }
  };

  listSessions = async (req: Request, res: Response): Promise<Response> => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Usuário não autenticado' });
      }
      const userId = req.user.id;
      const {
        page = 1,
        limit = 10,
        studyType,
        isCompleted,
        startDate,
        endDate,
        sortBy,
        sortOrder,
      } = req.query;

      const filters: StudySessionFilters = {
        studyType: studyType as StudySessionType,
        isCompleted: isCompleted === 'true',
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
      };

      const pagination: PaginationOptions = {
        page: Number(page),
        limit: Number(limit),
        sortBy: sortBy as string,
        sortOrder: sortOrder as 'asc' | 'desc',
      };

      const getUserStudySessionsUseCase = new GetUserStudySessionsUseCase(
        this.studySessionRepository,
      );
      const result = await getUserStudySessionsUseCase.execute(userId, filters, pagination);

      return res.status(200).json(result);
    } catch (error) {
      const appError = error as { name?: string; statusCode?: number; message?: string };
      if (appError.name === 'AppError') {
        return res.status(appError.statusCode || 400).json({ error: appError.message });
      }
      return res.status(500).json({ error: 'Internal server error' });
    }
  };

  updateSession = async (req: Request, res: Response): Promise<Response> => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Usuário não autenticado' });
      }
      const userId = req.user.id;
      const { id } = req.params;

      const { error, value } = validate('updateStudySession', req.body);
      if (error) {
        return res.status(400).json({ error: error.message });
      }

      const updateStudySessionUseCase = new UpdateStudySessionUseCase(this.studySessionRepository);
      const studySession = await updateStudySessionUseCase.execute(id, userId, value);

      return res.status(200).json(studySession);
    } catch (error) {
      const appError = error as { name?: string; statusCode?: number; message?: string };
      if (appError.name === 'AppError') {
        return res.status(appError.statusCode || 400).json({ error: appError.message });
      }
      return res.status(500).json({ error: 'Internal server error' });
    }
  };

  deleteSession = async (req: Request, res: Response): Promise<Response> => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Usuário não autenticado' });
      }
      const userId = req.user.id;
      const { id } = req.params;

      const deleteStudySessionUseCase = new DeleteStudySessionUseCase(this.studySessionRepository);
      await deleteStudySessionUseCase.execute(id, userId);

      return res.status(204).send();
    } catch (error) {
      const appError = error as { name?: string; statusCode?: number; message?: string };
      if (appError.name === 'AppError') {
        return res.status(appError.statusCode || 400).json({ error: appError.message });
      }
      return res.status(500).json({ error: 'Internal server error' });
    }
  };

  completeSession = async (req: Request, res: Response): Promise<Response> => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Usuário não autenticado' });
      }
      const userId = req.user.id;
      const { id } = req.params;

      const { error, value } = validate('completeStudySession', req.body);
      if (error) {
        return res.status(400).json({ error: error.message });
      }

      const completeStudySessionUseCase = new CompleteStudySessionUseCase(
        this.studySessionRepository,
      );
      const studySession = await completeStudySessionUseCase.execute(id, userId, value);

      return res.status(200).json(studySession);
    } catch (error) {
      const appError = error as { name?: string; statusCode?: number; message?: string };
      if (appError.name === 'AppError') {
        return res.status(appError.statusCode || 400).json({ error: appError.message });
      }
      return res.status(500).json({ error: 'Internal server error' });
    }
  };

  recordAnswer = async (req: Request, res: Response): Promise<Response> => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Usuário não autenticado' });
      }
      const userId = req.user.id;
      const { id } = req.params;

      const { error, value } = validate('recordAnswer', req.body);
      if (error) {
        return res.status(400).json({ error: error.message });
      }

      const recordStudySessionAnswerUseCase = new RecordStudySessionAnswerUseCase(
        this.studySessionRepository,
      );
      await recordStudySessionAnswerUseCase.execute(id, userId, value);

      return res.status(200).json({ message: 'Answer recorded successfully' });
    } catch (error) {
      const appError = error as { name?: string; statusCode?: number; message?: string };
      if (appError.name === 'AppError') {
        return res.status(appError.statusCode || 400).json({ error: appError.message });
      }
      return res.status(500).json({ error: 'Internal server error' });
    }
  };
}
