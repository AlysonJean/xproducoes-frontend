import BrandLoader from './BrandLoader';

export const PageLoadingSpinner = () => (
  <div className="flex flex-col items-center justify-center w-full min-h-[calc(100vh-200px)] py-20">
    <BrandLoader size="lg" />
  </div>
);
