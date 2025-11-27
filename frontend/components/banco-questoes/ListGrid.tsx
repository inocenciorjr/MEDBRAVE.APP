'use client';

import { QuestionList } from '@/types/banco-questoes';
import ListCard from './ListCard';

interface ListGridProps {
  lists: QuestionList[];
}

export default function ListGrid({ lists }: ListGridProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {lists.map((list) => (
        <ListCard key={list.id} list={list} />
      ))}
    </div>
  );
}
