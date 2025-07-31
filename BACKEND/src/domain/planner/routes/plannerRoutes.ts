import { Router } from 'express';
import { getPlannerTasks, createTask, updateTask, deleteTask } from '../services/PlannerService';

const router = Router();

router.get('/tasks', getPlannerTasks); // ?userId=...&start=...&end=...
router.post('/task', createTask);
router.patch('/task/:id', updateTask);
router.delete('/task/:id', deleteTask);

export default router; 