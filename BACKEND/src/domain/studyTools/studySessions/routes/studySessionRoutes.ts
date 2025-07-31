import { Router, RequestHandler, Response, NextFunction } from 'express';
import { StudySessionController } from '../controllers/studySessionController';
import { authMiddleware } from '../../../../domain/auth/middleware/auth.middleware';

export const createStudySessionRoutes = (controller: StudySessionController): Router => {
  const router = Router();

  // Wrappers para garantir tipagem correta
  const wrap = (fn: (req: any, res: Response, next: NextFunction) => any): RequestHandler => {
    return (req, res, next) => fn(req, res, next);
  };

  /**
   * @swagger
   * /api/study-sessions:
   *   post:
   *     summary: Create a new study session
   *     tags: [StudySessions]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/CreateStudySessionDTO'
   *     responses:
   *       201:
   *         description: Study session created successfully
   */
  router.post('/', authMiddleware, wrap(controller.createStudySession));

  /**
   * @swagger
   * /api/study-sessions/{id}:
   *   get:
   *     summary: Get a study session by ID
   *     tags: [StudySessions]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: Study session details
   */
  router.get('/:id', authMiddleware, wrap(controller.getSessionById));

  /**
   * @swagger
   * /api/study-sessions:
   *   get:
   *     summary: Get user study sessions with pagination and filters
   *     tags: [StudySessions]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: query
   *         name: page
   *         schema:
   *           type: integer
   *         default: 1
   *       - in: query
   *         name: limit
   *         schema:
   *           type: integer
   *         default: 10
   *       - in: query
   *         name: studyType
   *         schema:
   *           type: string
   *       - in: query
   *         name: isCompleted
   *         schema:
   *           type: boolean
   *       - in: query
   *         name: startDate
   *         schema:
   *           type: string
   *           format: date
   *       - in: query
   *         name: endDate
   *         schema:
   *           type: string
   *           format: date
   *     responses:
   *       200:
   *         description: List of study sessions
   */
  router.get('/', authMiddleware, wrap(controller.listSessions));

  /**
   * @swagger
   * /api/study-sessions/{id}:
   *   put:
   *     summary: Update a study session
   *     tags: [StudySessions]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/UpdateStudySessionDTO'
   *     responses:
   *       200:
   *         description: Study session updated successfully
   */
  router.put('/:id', authMiddleware, wrap(controller.updateSession));

  /**
   * @swagger
   * /api/study-sessions/{id}:
   *   delete:
   *     summary: Delete a study session
   *     tags: [StudySessions]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       204:
   *         description: Study session deleted successfully
   */
  router.delete('/:id', authMiddleware, wrap(controller.deleteSession));

  /**
   * @swagger
   * /api/study-sessions/{id}/complete:
   *   post:
   *     summary: Complete a study session
   *     tags: [StudySessions]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *     requestBody:
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/CompleteStudySessionDTO'
   *     responses:
   *       200:
   *         description: Study session completed successfully
   */
  router.post('/:id/complete', authMiddleware, wrap(controller.completeSession));

  /**
   * @swagger
   * /api/study-sessions/{id}/answers:
   *   post:
   *     summary: Record an answer in a study session
   *     tags: [StudySessions]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/RecordAnswerDTO'
   *     responses:
   *       200:
   *         description: Answer recorded successfully
   */
  router.post('/:id/answers', authMiddleware, wrap(controller.recordAnswer));

  return router;
};
