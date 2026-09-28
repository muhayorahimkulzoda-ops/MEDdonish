'use client';

import { useEffect, useState } from 'react';

export type StageSlide = {
  image?: string;
  kind: 'media' | 'notes' | 'tests';
  kicker: string;
  title: string;
  lead: string;
};

export function HomeStage({
  slides,
  href,
  label,
}: {
  slides: StageSlide[];
  href: string;
  label: string;
}) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;
    const timer = window.setInterval(() => {
      setIndex((current) => (current + 1) % slides.length);
    }, 3400);
    return () => window.clearInterval(timer);
  }, [slides.length]);

  return (
    <a className="stage-deck" href={href} aria-label={label}>
      <div className="stage-scene">
        {slides.map((slide, slideIndex) => {
          let offset = slideIndex - index;
          const half = Math.floor(slides.length / 2);
          if (offset > half) offset -= slides.length;
          if (offset < -half) offset += slides.length;
          const active = offset === 0;
          return (
            <article
              className={`stage-slide${active ? ' is-active' : ''}`}
              key={`${slide.kind}-${slide.title}-${slideIndex}`}
              style={{
                transform: `translateX(${offset * 18}%) rotateY(${offset * -42}deg) translateZ(${active ? 56 : -90}px) scale(${active ? 1 : 0.86})`,
                opacity: Math.abs(offset) > 1 ? 0 : active ? 1 : 0.42,
                zIndex: 8 - Math.abs(offset),
              }}
              aria-hidden={!active}
            >
              {slide.image ? <img src={slide.image} alt="" /> : <span className={`stage-mark stage-mark-${slide.kind}`} />}
              <div className="stage-copy">
                <em>{slide.kicker}</em>
                <strong>{slide.title}</strong>
                <p>{slide.lead}</p>
              </div>
            </article>
          );
        })}
      </div>
    </a>
  );
}
