import request from 'supertest';
import express from 'express';
import { firestore } from 'firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';
import { createRouter } from '../../../../routes';
import { ProgrammedReviewContentType, ProgrammedReviewStatus, ReviewQuality } from '../../types';

// Mock do firestore
jest.mock('firebase-admin/firestore', () => {
  const originalModule = jest.requireActual('firebase-admin/firestore');
  return {
    ...originalModule,
    Timestamp: {
      now: jest.fn(() => ({
        toMillis: jest.fn(() => Date.now()),
        toDate: jest.fn(() => new Date()),
        toJSON: jest.fn(() => ({ seconds: Math.floor(Date.now() / 1000), nanoseconds: 0 })),
      })),
      fromMillis: jest.fn(ms => ({
        toMillis: jest.fn(() => ms),
        toDate: jest.fn(() => new Date(ms)),
        toJSON: jest.fn(() => ({ seconds: Math.floor(ms / 1000), nanoseconds: 0 })),
      })),
    },
  };
});

// Mock do db com operações de CRUD
const mockDb = {
  collection: jest.fn().mockReturnThis(),
  doc: jest.fn().mockReturnThis(),
  where: jest.fn().mockReturnThis(),
  orderBy: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
  startAfter: jest.fn().mockReturnThis(),
  get: jest.fn(),
  set: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
} as unknown as firestore.Firestore;

describe('Programmed Review API Integration Tests', () => {
  let app: express.Application;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/api', createRouter(mockDb));
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/srs/programmed-reviews', () => {
    it('should create a new programmed review', async () => {
      // Arrange
      const mockReviewId = 'test-review-id';
      const mockReviewData = {
        userId: 'user-123',
        contentId: 'content-123',
        contentType: ProgrammedReviewContentType.QUESTION,
      };

      // Mock da geração do ID no firestore e do set
      const mockDocRef = {
        id: mockReviewId,
        set: jest.fn().mockResolvedValue({}),
      };

      // Setup dos mocks
      (mockDb.collection as jest.Mock).mockImplementation(() => ({
        doc: jest.fn().mockReturnValue(mockDocRef),
      }));

      // Act
      const response = await request(app).post('/api/srs/programmed-reviews').send(mockReviewData);

      // Assert
      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id', mockReviewId);
      expect(response.body).toHaveProperty('userId', mockReviewData.userId);
      expect(response.body).toHaveProperty('contentId', mockReviewData.contentId);
      expect(response.body).toHaveProperty('contentType', mockReviewData.contentType);
      expect(response.body).toHaveProperty('status', ProgrammedReviewStatus.LEARNING);
      expect(mockDocRef.set).toHaveBeenCalled();
    });

    it('should return 400 when required fields are missing', async () => {
      // Arrange
      const mockReviewData = {
        userId: 'user-123',
        // contentId missing on purpose
        contentType: ProgrammedReviewContentType.QUESTION,
      };

      // Act
      const response = await request(app).post('/api/srs/programmed-reviews').send(mockReviewData);

      // Assert
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /api/srs/programmed-reviews/:id', () => {
    it('should return a programmed review by id', async () => {
      // Arrange
      const mockReviewId = 'test-review-id';
      const mockReview = {
        id: mockReviewId,
        userId: 'user-123',
        contentId: 'content-123',
        contentType: ProgrammedReviewContentType.QUESTION,
        status: ProgrammedReviewStatus.LEARNING,
        nextReviewAt: Timestamp.now(),
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };

      // Setup do mock
      (mockDb.collection as jest.Mock).mockImplementation(() => ({
        doc: jest.fn().mockReturnValue({
          get: jest.fn().mockResolvedValue({
            exists: true,
            data: () => mockReview,
          }),
        }),
      }));

      // Act
      const response = await request(app).get(`/api/srs/programmed-reviews/${mockReviewId}`);

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('id', mockReviewId);
      expect(response.body).toHaveProperty('userId', mockReview.userId);
      expect(response.body).toHaveProperty('contentId', mockReview.contentId);
      expect(response.body).toHaveProperty('contentType', mockReview.contentType);
    });

    it('should return 404 when review is not found', async () => {
      // Arrange
      const mockReviewId = 'non-existent-id';

      // Setup do mock
      (mockDb.collection as jest.Mock).mockImplementation(() => ({
        doc: jest.fn().mockReturnValue({
          get: jest.fn().mockResolvedValue({
            exists: false,
          }),
        }),
      }));

      // Act
      const response = await request(app).get(`/api/srs/programmed-reviews/${mockReviewId}`);

      // Assert
      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('PUT /api/srs/programmed-reviews/:id', () => {
    it('should update a programmed review with quality', async () => {
      // Arrange
      const mockReviewId = 'test-review-id';
      const mockReview = {
        id: mockReviewId,
        userId: 'user-123',
        contentId: 'content-123',
        contentType: ProgrammedReviewContentType.QUESTION,
        status: ProgrammedReviewStatus.LEARNING,
        intervalDays: 1,
        easeFactor: 2.5,
        repetitions: 0,
        lapses: 0,
        nextReviewAt: Timestamp.now(),
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };

      const updatedReview = {
        ...mockReview,
        status: ProgrammedReviewStatus.REVIEWING,
        intervalDays: 1,
        repetitions: 1,
        nextReviewAt: Timestamp.fromMillis(Date.now() + 24 * 60 * 60 * 1000), // +1 day
      };

      // Setup do mock
      (mockDb.collection as jest.Mock).mockImplementation(() => ({
        doc: jest.fn().mockReturnValue({
          get: jest
            .fn()
            .mockResolvedValueOnce({
              exists: true,
              data: () => mockReview,
            })
            .mockResolvedValueOnce({
              exists: true,
              data: () => updatedReview,
            }),
          update: jest.fn().mockResolvedValue({}),
        }),
      }));

      // Act
      const response = await request(app)
        .put(`/api/srs/programmed-reviews/${mockReviewId}`)
        .send({ quality: ReviewQuality.GOOD });

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('id', mockReviewId);
      expect(response.body).toHaveProperty('status', ProgrammedReviewStatus.REVIEWING);
      expect(response.body).toHaveProperty('repetitions', 1);
    });

    it('should return 400 when quality is invalid', async () => {
      // Arrange
      const mockReviewId = 'test-review-id';

      // Act
      const response = await request(app)
        .put(`/api/srs/programmed-reviews/${mockReviewId}`)
        .send({ quality: 5 }); // Invalid quality value

      // Assert
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /api/srs/programmed-reviews/user/:userId/due', () => {
    it('should list due reviews for a user', async () => {
      // Arrange
      const mockUserId = 'user-123';
      const mockReviews = [
        {
          id: 'review-1',
          userId: mockUserId,
          contentId: 'content-1',
          contentType: ProgrammedReviewContentType.QUESTION,
          status: ProgrammedReviewStatus.LEARNING,
          nextReviewAt: Timestamp.now(),
        },
        {
          id: 'review-2',
          userId: mockUserId,
          contentId: 'content-2',
          contentType: ProgrammedReviewContentType.FLASHCARD,
          status: ProgrammedReviewStatus.REVIEWING,
          nextReviewAt: Timestamp.now(),
        },
      ];

      // Setup dos mocks para estatísticas do usuário
      const userStatsRef = {
        get: jest.fn().mockResolvedValue({
          exists: true,
          data: () => ({ weakestFilters: [] }),
        }),
      };

      (mockDb.collection as jest.Mock).mockImplementation((collectionName: any) => {
        if (collectionName === 'userStatistics') {
          return {
            doc: jest.fn().mockReturnValue(userStatsRef),
          };
        }
        return {
          where: jest.fn().mockReturnThis(),
          orderBy: jest.fn().mockReturnThis(),
          limit: jest.fn().mockReturnThis(),
          get: jest.fn().mockResolvedValue({
            docs: mockReviews.map(review => ({
              id: review.id,
              data: () => review,
            })),
          }),
        };
      });

      // Act
      const response = await request(app).get(`/api/srs/programmed-reviews/user/${mockUserId}/due`);

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('reviews');
      expect(response.body.reviews).toHaveLength(2);
      expect(response.body.reviews[0]).toHaveProperty('id', 'review-1');
      expect(response.body.reviews[1]).toHaveProperty('id', 'review-2');
    });
  });
});
