'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useMemo } from 'react';
import type { TopicConfig } from '@/lib/types';

interface Props {
  topics: TopicConfig[];
}

export function NavigationTabs({ topics }: Props) {
  const pathname = usePathname();

  const defaultTopicId = topics[0]?.id ?? '';

  const activeId = useMemo(() => {
    const match = pathname?.split('/').filter(Boolean)[1];
    return match ?? defaultTopicId;
  }, [pathname, defaultTopicId]);

  if (!topics.length) {
    return null;
  }

  return (
    <nav className="flex flex-wrap gap-3 justify-center md:justify-start">
      {topics.map((topic) => {
        const isActive = topic.id === activeId || (!activeId && topic.id === defaultTopicId);
        const href = topic.id === defaultTopicId ? '/' : `/topic/${topic.id}`;
        return (
          <Link
            key={topic.id}
            href={href}
            className={`tab-button px-5 py-3 rounded-full border text-sm font-semibold uppercase tracking-[0.2em] ${
              isActive
                ? 'bg-electric/20 border-electric text-electric shadow-lg'
                : 'border-slate-600/50 text-slate-300 hover:text-white'
            }`}
          >
            {topic.title}
          </Link>
        );
      })}
    </nav>
  );
}
