import React, { useEffect, useState } from 'react';
import { useAuth } from '../../AuthContext.tsx';

interface CategoryListProps {
  onCategorySelect?: (category: string) => void;
  selectedCategory?: string;
}

function CategoryList({ onCategorySelect, selectedCategory }: CategoryListProps) {
  const { restaurantId } = useAuth();
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!restaurantId) {
      setCategories([]);
      setLoading(false);
      return;
    }
    // Fetch menu items and extract unique categories
    fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api/restaurants/${restaurantId}/menu`, { credentials: 'include' })
      .then(res => res.json())
      .then((data: any[]) => {
        const uniqueCategories = Array.from(new Set(data.map((item: any) => item.category).filter(Boolean)));
        setCategories(uniqueCategories as string[]);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [restaurantId]);

  if (loading) return <div>Loading categories...</div>;

  return (
    <div className="mb-4">
      <button
        className={`mr-2 px-3 py-1 rounded ${!selectedCategory ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
        onClick={() => onCategorySelect && onCategorySelect('')}
      >
        All
      </button>
      {categories.map(cat => (
        <button
          key={cat}
          className={`mr-2 px-3 py-1 rounded ${selectedCategory === cat ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
          onClick={() => onCategorySelect && onCategorySelect(cat)}
        >
          {cat}
        </button>
      ))}
    </div>
  );
}

export default CategoryList; 