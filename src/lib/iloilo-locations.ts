// Iloilo service-area locations — municipality → barangays.
// Verified against PSGC/PhilAtlas (2024–2025). Covers RedZone's current
// service area. Add municipalities here as the service area expands.
//
// Barangay counts: Anilao 21, Barotac Nuevo 29, Dingle 33, Lemery 31, San Enrique 28.

export interface Municipality {
  name: string;
  barangays: string[];
}

export const ILOILO_LOCATIONS: Municipality[] = [
  {
    name: 'Anilao',
    barangays: [
      'Agbatuan', 'Badiang', 'Balabag', 'Balunos', 'Cag-an', 'Camiros',
      'Sambag Culob', 'Dangula-an', 'Guipis', 'Manganese', 'Medina', 'Mostro',
      'Palaypay', 'Pantalan', 'Poblacion', 'San Carlos', 'San Juan Crisostomo',
      'Santa Rita', 'Santo Rosario', 'Serallo', 'Vista Alegre',
    ],
  },
  {
    name: 'Barotac Nuevo',
    barangays: [
      'Acuit', 'Agcuyawan Calsada', 'Agcuyawan Pulo', 'Bagongbong', 'Baras',
      'Bungca', 'Cabilauan', 'Cruz', 'Guintas', 'Igbong', 'Ilaud Poblacion',
      'Ilaya Poblacion', 'Jalaud', 'Lagubang', 'Lanas', 'Lico-an', 'Linao',
      'Monpon', 'Palaciawan', 'Patag', 'Salihid', 'Sohoton', 'So-ol', 'Tabucan',
      'Tabuc-Suba', 'Talisay', 'Tinorian', 'Tiwi', 'Tubungan',
    ],
  },
  {
    name: 'Dingle',
    barangays: [
      'Abangay', 'Agsalanan', 'Agtatacay', 'Alegria', 'Bongloy', 'Buenavista',
      'Caguyuman', 'Calicuang', 'Camambugan', 'Dawis', 'Ginalinan Nuevo',
      'Ginalinan Viejo', 'Gutao', 'Ilajas', 'Libo-o', 'Licu-an', 'Lincud',
      'Matangharon', 'Moroboro', 'Namatay', 'Nazuni', 'Pandan', 'Poblacion',
      'Potolan', 'San Jose', 'San Matias', 'Siniba-an', 'Tabugon', 'Tambunac',
      'Tanghawan', 'Tiguib', 'Tinocuan', 'Tulatula-an',
    ],
  },
  {
    name: 'Lemery',
    barangays: [
      'Agpipili', 'Alcantara', 'Almeñana', 'Anabo', 'Bankal', 'Buenavista',
      'Cabantohan', 'Capiñahan', 'Dalipe', 'Dapdapan', 'Gerongan', 'Imbaulan',
      'Layogbato', 'Marapal', 'Milan', 'Nagsulang', 'Nasapahan', 'Omio',
      'Pacuan', 'Poblacion NW Zone', 'Poblacion SE Zone', 'Pontoc',
      'San Antonio', 'San Diego', 'San Jose Moto', 'Sepanton', 'Sincua',
      'Tabunan', 'Tugas', 'Velasco', 'Yawyawan',
    ],
  },
  {
    name: 'San Enrique',
    barangays: [
      'Abaca', 'Asisig', 'Bantayan', 'Braulan', 'Cabugao Nuevo', 'Cabugao Viejo',
      'Camiri', 'Catan-agan', 'Compo', 'Cubay', 'Dacal', 'Dumiles', 'Garita',
      'Gines Nuevo', 'Imbang Pequeño', 'Imbesad-an', 'Iprog', 'Lip-ac', 'Madarag',
      'Mapili', 'Paga', 'Palje', 'Poblacion Ilawod', 'Poblacion Ilaya',
      'Quinolpan', 'Rumagayray', 'San Antonio', 'Tambunac',
    ],
  },
];

export const MUNICIPALITY_NAMES = ILOILO_LOCATIONS.map((m) => m.name);

export function barangaysFor(municipality: string | undefined): string[] {
  if (!municipality) return [];
  return ILOILO_LOCATIONS.find((m) => m.name === municipality)?.barangays ?? [];
}
