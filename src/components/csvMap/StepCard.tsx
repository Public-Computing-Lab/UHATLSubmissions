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
        title: 'Mark the Hottest Spot 🔥',
        desc: 'Where did you feel the hottest on your walk? Add a note and tap the map to place a marker.',
        value: hotNote,
        setter: setHotNote,
        placeholder: 'What made this spot feel hot?',
        next: () => {},
      };
    }
    if (step === 2) {
      return {
        title: 'Mark the Coolest Spot ❄️',
        desc: 'Where did you feel the coolest on your walk? Add a note and tap the map to place a marker.',
        value: coolNote,
        setter: setCoolNote,
        placeholder: 'What made this spot feel cool?',
        next: () => {},
      };
    }
    return {
      title: 'Tell Your Story 📖',
      desc: 'What does this route mean to you? Why did you choose to collect data here?',
      value: routeMeaning,
      setter: setRouteMeaning,
      placeholder: 'Share your connection to this route...',
      next: onFinish,
    };
  };

  const content = getContent();
  const isValid = content.value.trim().length > 0;

  return (
    <div className="step-card-mobile">
      {/* Progress Indicator */}
      <div className="flex items-center justify-center mb-4">
        <div className="flex space-x-2">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`h-2 rounded-full transition-all duration-300 ${
                s === step 
                  ? 'w-8 bg-purple-600' 
                  : s < step 
                  ? 'w-2 bg-purple-400' 
                  : 'w-2 bg-gray-300'
              }`}
            />
          ))}
        </div>
      </div>

      <h2 className="text-xl font-bold text-gray-900 mb-2">{content.title}</h2>
      <p className="text-sm text-gray-600 mb-4">{content.desc}</p>

      <textarea
        value={content.value}
        onChange={(e) => content.setter(e.target.value)}
        placeholder={content.placeholder}
        className="w-full p-4 border border-gray-300 rounded-xl resize-none text-gray-900 placeholder-gray-500 
                   focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent 
                   transition-all duration-200"
        rows={3}
      />

      {step < 3 && (
        <div className="mt-4 flex items-center justify-between text-sm">
          <p className={`transition-opacity duration-300 ${
            isValid ? 'opacity-100 text-purple-600 font-medium' : 'opacity-0'
          }`}>
            ✓ Ready to place on map
          </p>
          <p className="text-gray-500">Step {step} of 3</p>
        </div>
      )}

      {step === 3 && (
        <button
          onClick={content.next}
          disabled={!isValid}
          className={`w-full mt-4 py-3 px-4 rounded-xl font-semibold transition-all duration-200 ${
            isValid
              ? 'bg-purple-600 text-white hover:bg-purple-700 shadow-lg transform hover:-translate-y-0.5'
              : 'bg-gray-200 text-gray-400 cursor-not-allowed'
          }`}
        >
          Continue to Review
        </button>
      )}
    </div>
  );
}
