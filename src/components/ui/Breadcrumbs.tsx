import { Link, useLocation } from 'react-router-dom';
import { ChevronRightIcon, HomeIcon } from '@heroicons/react/24/solid';
import { generateBreadcrumbSchema } from '../../utils/schemaGenerator';
import { StructuredData } from '../seo/StructuredData';

interface BreadcrumbsProps {
  items?: { label: string; path?: string }[];
}

export const Breadcrumbs: React.FC<BreadcrumbsProps> = ({ items = [] }) => {
  const location = useLocation();
  const pathSegments = location.pathname.split('/').filter(Boolean);

  // Generate default items if none provided
  const breadcrumbItems = items.length > 0 
    ? items 
    : pathSegments.map((segment, index) => {
        const path = `/${pathSegments.slice(0, index + 1).join('/')}`;
        // Basic capitalization for default logic
        const label = segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, ' ');
        return { label, path };
      });

  // Prepare Schema Data
  const schemaItems = [
    { name: 'Início', item: '/' },
    ...breadcrumbItems.map(item => ({
      name: item.label,
      item: item.path || ''
    }))
  ];

  const breadcrumbSchema = generateBreadcrumbSchema(schemaItems);

  return (
    <nav aria-label="Breadcrumb" className="mb-6 hidden md:block">
      <StructuredData schema={breadcrumbSchema} />
      <ol className="flex items-center space-x-2 text-sm text-muted-foreground">
        <li>
          <Link to="/" className="hover:text-primary transition-colors flex items-center">
            <HomeIcon className="w-4 h-4" />
            <span className="sr-only">Início</span>
          </Link>
        </li>
        {breadcrumbItems.map((item, index) => (
          <li key={index} className="flex items-center">
            <ChevronRightIcon className="w-4 h-4 mx-2 text-border" />
            {item.path ? (
              <Link to={item.path} className="hover:text-primary transition-colors capitalize">
                {item.label}
              </Link>
            ) : (
              <span className="font-medium text-foreground capitalize" aria-current="page">
                {item.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
};
