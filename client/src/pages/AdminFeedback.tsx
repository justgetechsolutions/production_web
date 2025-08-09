import React, { useEffect, useState } from "react";
import { useAuth } from "../AuthContext.tsx";
// @ts-ignore
import jsPDF from "jspdf";
// @ts-ignore
import autoTable from "jspdf-autotable";

interface Feedback {
  _id: string;
  message: string;
  category?: string;
  tableNumber?: string;
  createdAt: string;
}

const CATEGORY_OPTIONS = [
  { value: "all", label: "All" },
  { value: "tech", label: "QR Ordering Experience" },
  { value: "food", label: "Food Feedback" },
];

const AdminFeedback: React.FC = () => {
  const { restaurantId } = useAuth();
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<string>("all");

  useEffect(() => {
    const fetchFeedbacks = async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `${import.meta.env.VITE_API_BASE_URL || "http://localhost:5000"}/api/feedback`,
          { credentials: "include" }
        );
        const data = await res.json();
        setFeedbacks(data);
        setError("");
      } catch (err) {
        setError("Failed to load feedback.");
        setFeedbacks([]);
      } finally {
        setLoading(false);
      }
    };
    if (restaurantId) fetchFeedbacks();
  }, [restaurantId]);

  const filteredFeedbacks = filter === "all"
    ? feedbacks
    : feedbacks.filter(fb => fb.category === filter);

  const handleDownloadPDF = () => {
    const doc = new jsPDF();
    autoTable(doc, {
      head: [["Category", "Message", "Date & Time"]],
      body: filteredFeedbacks.map(fb => [
        fb.category === 'tech' ? 'QR Ordering Experience' : fb.category === 'food' ? 'Food Feedback' : '-',
        fb.message,
        new Date(fb.createdAt).toLocaleString()
      ]),
      styles: { fontSize: 10 },
      headStyles: { fillColor: [41, 128, 185] },
    });
    doc.save("feedbacks.pdf");
  };

  return (
    <div className="p-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
        <h1 className="text-2xl font-bold">General Feedback</h1>
        <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
          <select
            className="border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
            value={filter}
            onChange={e => setFilter(e.target.value)}
          >
            {CATEGORY_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <button
            onClick={handleDownloadPDF}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2 rounded shadow text-sm"
          >
            Download PDF
          </button>
        </div>
      </div>
      {loading ? (
        <div>Loading feedback...</div>
      ) : error ? (
        <div className="text-red-600 font-semibold p-4">{error}</div>
      ) : filteredFeedbacks.length === 0 ? (
        <div className="text-gray-500">No feedback yet.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white rounded shadow text-sm">
            <thead>
              <tr>
                <th className="px-4 py-2 border-b text-left">Category</th>
                <th className="px-4 py-2 border-b text-left">Message</th>
                <th className="px-4 py-2 border-b text-left">Date & Time</th>
              </tr>
            </thead>
            <tbody>
              {filteredFeedbacks.map(fb => (
                <tr key={fb._id} className="hover:bg-blue-50">
                  <td className="px-4 py-2 border-b">
                    {fb.category === 'tech' && (
                      <span className="inline-block px-2 py-1 rounded-full bg-blue-100 text-blue-700 font-semibold">QR Ordering Experience</span>
                    )}
                    {fb.category === 'food' && (
                      <span className="inline-block px-2 py-1 rounded-full bg-green-100 text-green-700 font-semibold">Food Feedback</span>
                    )}
                    {!fb.category && <span className="text-gray-400">-</span>}
                  </td>
                  <td className="px-4 py-2 border-b text-blue-700 font-semibold break-words">{fb.message}</td>
                  <td className="px-4 py-2 border-b text-xs">{new Date(fb.createdAt).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default AdminFeedback; 