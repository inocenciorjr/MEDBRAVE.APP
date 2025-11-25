// API service for planner functionality
import { fetchWithAuth } from '@/lib/utils/fetchWithAuth';

const API_BASE_URL = '/planner';

class PlannerApi {
  async getTasks(user_id, start = null, end = null) {
    try {
      let url = `${API_BASE_URL}/tasks?user_id=${user_id}`;
      if (start) url += `&start=${start}`;
      if (end) url += `&end=${end}`;
      
      const response = await fetchWithAuth(url);
      if (!response.ok) {
        throw new Error('Failed to fetch tasks');
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching tasks:', error);
      return [];
    }
  }

  async createTask(taskData) {
    try {
      const response = await fetchWithAuth(`${API_BASE_URL}/task`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(taskData),
      });
      if (!response.ok) {
        throw new Error('Failed to create task');
      }
      return await response.json();
    } catch (error) {
      console.error('Error creating task:', error);
      throw error;
    }
  }

  async updateTask(taskId, taskData) {
    try {
      const response = await fetchWithAuth(`${API_BASE_URL}/task/${taskId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(taskData),
      });
      if (!response.ok) {
        throw new Error('Failed to update task');
      }
      return await response.json();
    } catch (error) {
      console.error('Error updating task:', error);
      throw error;
    }
  }

  async deleteTask(taskId) {
    try {
      const response = await fetchWithAuth(`${API_BASE_URL}/task/${taskId}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        throw new Error('Failed to delete task');
      }
      return true;
    } catch (error) {
      console.error('Error deleting task:', error);
      throw error;
    }
  }

  async completeTask(taskId) {
    try {
      const response = await fetchWithAuth(`${API_BASE_URL}/tasks/${taskId}/complete`, {
        method: 'POST',
      });
      if (!response.ok) {
        throw new Error('Failed to complete task');
      }
      return await response.json();
    } catch (error) {
      console.error('Error completing task:', error);
      throw error;
    }
  }
}

const plannerApi = new PlannerApi();
export default plannerApi;