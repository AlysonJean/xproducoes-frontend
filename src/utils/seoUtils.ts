/**
 * Utilitários para SEO de nomes de arquivos
 */

export const normalizeForSeo = (text: string): string => {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Remove acentos
    .replace(/[^a-z0-9\- ]/g, "") // Mantém apenas letras, números e hífens
    .trim()
    .replace(/\s+/g, "-"); // Substitui espaços por hífen
};

export const generateSeoFilename = (
  folder: 'equipments' | 'banners' | 'portfolio' | 'kits' | 'clients' | 'categories' | 'branding' | 'services' | 'others',
  name: string,
  categoryOrContext?: string
): string => {
  const normalizedName = normalizeForSeo(name);
  const normalizedContext = categoryOrContext ? normalizeForSeo(categoryOrContext) : '';
  
  // No timestamp needed if uniqueness is handled by Cloudinary options or not strictly required
  // But generally good to keep simple and clean for SEO.

  switch (folder) {
    case 'equipments':
      // category-equipment-name
      return normalizedContext ? `${normalizedContext}-${normalizedName}` : normalizedName;
    case 'portfolio':
    case 'banners':
    case 'kits':
    case 'services':
    case 'categories':
      return normalizedName;
    case 'branding':
      return normalizedContext ? `${normalizedContext}-${normalizedName}` : normalizedName;
    case 'clients':
       // client-name-avatar
       return `${normalizedName}-avatar`;
    default:
      return normalizedName;
  }
};
