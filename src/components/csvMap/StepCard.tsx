'use client';

import './styles/stepcard.css'

export default function StepCard({
  step,
  hotNote,
  setHotNote,
  coolNote,
  setCoolNote,
  routeMeaning,
  setRouteMeaning,
  onFinish
}: {
  step: number;
  hotNote: string;
  setHotNote: (v: string) => void;
  coolNote: string;
  setCoolNote: (v: string) => void;
  routeMeaning: string;
  setRouteMeaning: (v: string) => void;
  onFinish: () => void;
}) {
  const getContent = () => {
    if (step === 1) {
      return {
        title: 'Tell us More!',
        desc: 'Where did you feel hottest on your walk? Click to place a pin at this location.',
        value: hotNote,
        setter: setHotNote,
        next: () => {},
      };
    }
    if (step === 2) {
      return {
        title: 'Tell us More!',
        desc: 'Where did you feel coolest on your walk? Click to place a pin at this location.',
        value: coolNote,
        setter: setCoolNote,
        next: () => {},
      };
    }
    return {
      title: 'Tell us More!',
      desc: 'What does this route mean to you? Tell us why you chose to do this walk in particular.',
      value: routeMeaning,
      setter: setRouteMeaning,
      next: onFinish,
    };
  };

  const { title, desc, value, setter, next } = getContent();

  return (
    <div className="question-card">
      <h2>{title}</h2>
      <p>{desc}</p>
      <textarea
        placeholder="Add a Note!"
        className="note-input"
        value={value}
        onChange={(e) => setter(e.target.value)}
      />
      <button className="submit-button" onClick={next}>
        {step < 3 ? 'Next' : 'Finish'}
      </button>
    </div>
  );
}
