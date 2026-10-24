import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import axiosClient from '../utils/axiosClient';

function AdminUpdate() {
  const navigate = useNavigate();
  const [problems, setProblems] = useState([]);
  const [message, setMessage] = useState('');

  useEffect(() => {
    axiosClient.get('/problem/getAllProblem')
      .then(({ data }) => setProblems(data))
      .catch(() => setMessage('Unable to load problems.'));
  }, []);

  const updateProblem = async (problem) => {
    try {
      await axiosClient.put(`/problem/update/${problem._id}`, {
        title: problem.title,
        difficulty: problem.difficulty,
        tags: problem.tags,
      });
      setMessage(`${problem.title} updated.`);
    } catch (error) {
      setMessage(error.response?.data?.message || error.response?.data || 'Unable to update problem.');
    }
  };

  return (
    <main className="container mx-auto max-w-4xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-bold">Update Problems</h1>
        <button className="btn btn-ghost" onClick={() => navigate('/admin')}>Back</button>
      </div>
      {message && <div className="alert alert-info mb-4">{message}</div>}
      <div className="space-y-4">
        {problems.map((problem) => (
          <div className="card bg-base-100 p-4 shadow" key={problem._id}>
            <input
              className="input input-bordered mb-3"
              value={problem.title}
              onChange={(event) => setProblems((current) => current.map((item) => (
                item._id === problem._id ? { ...item, title: event.target.value } : item
              )))}
            />
            <div className="flex flex-wrap gap-3">
              <select
                className="select select-bordered"
                value={problem.difficulty}
                onChange={(event) => setProblems((current) => current.map((item) => (
                  item._id === problem._id ? { ...item, difficulty: event.target.value } : item
                )))}
              >
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
              <select
                className="select select-bordered"
                value={problem.tags}
                onChange={(event) => setProblems((current) => current.map((item) => (
                  item._id === problem._id ? { ...item, tags: event.target.value } : item
                )))}
              >
                <option value="array">Array</option>
                <option value="linkedList">Linked List</option>
                <option value="graph">Graph</option>
                <option value="dp">DP</option>
              </select>
              <button className="btn btn-primary" onClick={() => updateProblem(problem)}>Save changes</button>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}

export default AdminUpdate;
