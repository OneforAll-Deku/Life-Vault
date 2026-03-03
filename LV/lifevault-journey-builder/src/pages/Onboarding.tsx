import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ImagePlus, Shield, Share2, ArrowRight, Heart } from 'lucide-react';


const STEPS = [
  {
    icon: ImagePlus,
    title: 'Your Life Timeline',
    description: 'Block Pix is your personal space to store and organize life\'s most precious moments. Photos, documents, videos - all in one secure place.'
  },
  {
    icon: Shield,
    title: 'Your Data, Your Control',
    description: 'Every memory is encrypted and stored securely. Only you can access your files. We can\'t see them, and neither can anyone else unless you choose to share.'
  },
  {
    icon: Share2,
    title: 'Share on Your Terms',
    description: 'When you share, you decide who can see what and for how long. Revoke access anytime. Your memories, your rules.'
  }
];

const Onboarding: React.FC = () => {
  const [step, setStep] = useState(0);
  const navigate = useNavigate();

  const currentStep = STEPS[step];
  const isLastStep = step === STEPS.length - 1;
  const StepIcon = currentStep.icon;

  const handleNext = () => {
    if (isLastStep) {
      navigate('/dashboard');
    } else {
      setStep(step + 1);
    }
  };

  const handleSkip = () => {
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center bg-gray-50 px-4 overflow-hidden">
      <div className="w-full max-w-md relative z-10">
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8 text-center">
          {/* Progress */}
          <div className="flex justify-center gap-2 mb-8">
            {STEPS.map((_, index) => (
              <div
                key={index}
                className={`h-2 rounded-full transition-all duration-300 ${index === step ? 'w-8 bg-black' : 'w-2 bg-gray-200'
                  }`}
              />
            ))}
          </div>

          {/* Icon */}
          <div className="w-20 h-20 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-gray-100">
            <StepIcon className="w-10 h-10 text-black" />
          </div>

          {/* Content */}
          <h2 className="text-2xl font-bold text-gray-900 mb-4">{currentStep.title}</h2>
          <p className="text-gray-500 leading-relaxed mb-8">{currentStep.description}</p>

          {/* Actions */}
          <div className="flex items-center justify-between">
            <button
              onClick={handleSkip}
              className="px-4 py-2 text-gray-400 hover:text-black text-sm font-medium transition-colors"
            >
              Skip
            </button>
            <button
              onClick={handleNext}
              className="flex items-center gap-2 px-6 py-3 bg-black text-white rounded-xl font-bold hover:bg-zinc-800 transition-all shadow-xl shadow-black/10"
            >
              {isLastStep ? (
                <>
                  Get Started
                  <Heart className="w-4 h-4" />
                </>
              ) : (
                <>
                  Continue
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Onboarding;