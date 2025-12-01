'use client';

import { useState, useEffect, useRef } from 'react';

interface Country {
  code: string;
  name: string;
  dialCode: string;
  flag: string;
}

const COUNTRIES: Country[] = [
  { code: 'AF', name: 'Afeganistão', dialCode: '+93', flag: '🇦🇫' },
  { code: 'ZA', name: 'África do Sul', dialCode: '+27', flag: '🇿🇦' },
  { code: 'AL', name: 'Albânia', dialCode: '+355', flag: '🇦🇱' },
  { code: 'DE', name: 'Alemanha', dialCode: '+49', flag: '🇩🇪' },
  { code: 'AD', name: 'Andorra', dialCode: '+376', flag: '🇦🇩' },
  { code: 'AO', name: 'Angola', dialCode: '+244', flag: '🇦🇴' },
  { code: 'AI', name: 'Anguilla', dialCode: '+1264', flag: '🇦🇮' },
  { code: 'AG', name: 'Antígua e Barbuda', dialCode: '+1268', flag: '🇦🇬' },
  { code: 'SA', name: 'Arábia Saudita', dialCode: '+966', flag: '🇸🇦' },
  { code: 'DZ', name: 'Argélia', dialCode: '+213', flag: '🇩🇿' },
  { code: 'AR', name: 'Argentina', dialCode: '+54', flag: '🇦🇷' },
  { code: 'AM', name: 'Armênia', dialCode: '+374', flag: '🇦🇲' },
  { code: 'AW', name: 'Aruba', dialCode: '+297', flag: '🇦🇼' },
  { code: 'AU', name: 'Austrália', dialCode: '+61', flag: '🇦🇺' },
  { code: 'AT', name: 'Áustria', dialCode: '+43', flag: '🇦🇹' },
  { code: 'AZ', name: 'Azerbaijão', dialCode: '+994', flag: '🇦🇿' },
  { code: 'BS', name: 'Bahamas', dialCode: '+1242', flag: '🇧🇸' },
  { code: 'BH', name: 'Bahrein', dialCode: '+973', flag: '🇧🇭' },
  { code: 'BD', name: 'Bangladesh', dialCode: '+880', flag: '🇧🇩' },
  { code: 'BB', name: 'Barbados', dialCode: '+1246', flag: '🇧🇧' },
  { code: 'BY', name: 'Belarus', dialCode: '+375', flag: '🇧🇾' },
  { code: 'BE', name: 'Bélgica', dialCode: '+32', flag: '🇧🇪' },
  { code: 'BZ', name: 'Belize', dialCode: '+501', flag: '🇧🇿' },
  { code: 'BJ', name: 'Benin', dialCode: '+229', flag: '🇧🇯' },
  { code: 'BM', name: 'Bermudas', dialCode: '+1441', flag: '🇧🇲' },
  { code: 'BO', name: 'Bolívia', dialCode: '+591', flag: '🇧🇴' },
  { code: 'BA', name: 'Bósnia e Herzegovina', dialCode: '+387', flag: '🇧🇦' },
  { code: 'BW', name: 'Botsuana', dialCode: '+267', flag: '🇧🇼' },
  { code: 'BR', name: 'Brasil', dialCode: '+55', flag: '🇧🇷' },
  { code: 'BN', name: 'Brunei', dialCode: '+673', flag: '🇧🇳' },
  { code: 'BG', name: 'Bulgária', dialCode: '+359', flag: '🇧🇬' },
  { code: 'BF', name: 'Burkina Faso', dialCode: '+226', flag: '🇧🇫' },
  { code: 'BI', name: 'Burundi', dialCode: '+257', flag: '🇧🇮' },
  { code: 'BT', name: 'Butão', dialCode: '+975', flag: '🇧🇹' },
  { code: 'CV', name: 'Cabo Verde', dialCode: '+238', flag: '🇨🇻' },
  { code: 'CM', name: 'Camarões', dialCode: '+237', flag: '🇨🇲' },
  { code: 'KH', name: 'Camboja', dialCode: '+855', flag: '🇰🇭' },
  { code: 'CA', name: 'Canadá', dialCode: '+1', flag: '🇨🇦' },
  { code: 'QA', name: 'Catar', dialCode: '+974', flag: '🇶🇦' },
  { code: 'KZ', name: 'Cazaquistão', dialCode: '+7', flag: '🇰🇿' },
  { code: 'TD', name: 'Chade', dialCode: '+235', flag: '🇹🇩' },
  { code: 'CL', name: 'Chile', dialCode: '+56', flag: '🇨🇱' },
  { code: 'CN', name: 'China', dialCode: '+86', flag: '🇨🇳' },
  { code: 'CY', name: 'Chipre', dialCode: '+357', flag: '🇨🇾' },
  { code: 'CO', name: 'Colômbia', dialCode: '+57', flag: '🇨🇴' },
  { code: 'KM', name: 'Comores', dialCode: '+269', flag: '🇰🇲' },
  { code: 'CG', name: 'Congo', dialCode: '+242', flag: '🇨🇬' },
  { code: 'KP', name: 'Coreia do Norte', dialCode: '+850', flag: '🇰🇵' },
  { code: 'KR', name: 'Coreia do Sul', dialCode: '+82', flag: '🇰🇷' },
  { code: 'CI', name: 'Costa do Marfim', dialCode: '+225', flag: '🇨🇮' },
  { code: 'CR', name: 'Costa Rica', dialCode: '+506', flag: '🇨🇷' },
  { code: 'HR', name: 'Croácia', dialCode: '+385', flag: '🇭🇷' },
  { code: 'CU', name: 'Cuba', dialCode: '+53', flag: '🇨🇺' },
  { code: 'CW', name: 'Curaçao', dialCode: '+599', flag: '🇨🇼' },
  { code: 'DK', name: 'Dinamarca', dialCode: '+45', flag: '🇩🇰' },
  { code: 'DJ', name: 'Djibuti', dialCode: '+253', flag: '🇩🇯' },
  { code: 'DM', name: 'Dominica', dialCode: '+1767', flag: '🇩🇲' },
  { code: 'EG', name: 'Egito', dialCode: '+20', flag: '🇪🇬' },
  { code: 'SV', name: 'El Salvador', dialCode: '+503', flag: '🇸🇻' },
  { code: 'AE', name: 'Emirados Árabes', dialCode: '+971', flag: '🇦🇪' },
  { code: 'EC', name: 'Equador', dialCode: '+593', flag: '🇪🇨' },
  { code: 'ER', name: 'Eritreia', dialCode: '+291', flag: '🇪🇷' },
  { code: 'SK', name: 'Eslováquia', dialCode: '+421', flag: '🇸🇰' },
  { code: 'SI', name: 'Eslovênia', dialCode: '+386', flag: '🇸🇮' },
  { code: 'ES', name: 'Espanha', dialCode: '+34', flag: '🇪🇸' },
  { code: 'US', name: 'Estados Unidos', dialCode: '+1', flag: '🇺🇸' },
  { code: 'EE', name: 'Estônia', dialCode: '+372', flag: '🇪🇪' },
  { code: 'SZ', name: 'Eswatini', dialCode: '+268', flag: '🇸🇿' },
  { code: 'ET', name: 'Etiópia', dialCode: '+251', flag: '🇪🇹' },
  { code: 'FJ', name: 'Fiji', dialCode: '+679', flag: '🇫🇯' },
  { code: 'PH', name: 'Filipinas', dialCode: '+63', flag: '🇵🇭' },
  { code: 'FI', name: 'Finlândia', dialCode: '+358', flag: '🇫🇮' },
  { code: 'FR', name: 'França', dialCode: '+33', flag: '🇫🇷' },
  { code: 'GA', name: 'Gabão', dialCode: '+241', flag: '🇬🇦' },
  { code: 'GM', name: 'Gâmbia', dialCode: '+220', flag: '🇬🇲' },
  { code: 'GH', name: 'Gana', dialCode: '+233', flag: '🇬🇭' },
  { code: 'GE', name: 'Geórgia', dialCode: '+995', flag: '🇬🇪' },
  { code: 'GI', name: 'Gibraltar', dialCode: '+350', flag: '🇬🇮' },
  { code: 'GD', name: 'Granada', dialCode: '+1473', flag: '🇬🇩' },
  { code: 'GR', name: 'Grécia', dialCode: '+30', flag: '🇬🇷' },
  { code: 'GL', name: 'Groenlândia', dialCode: '+299', flag: '🇬🇱' },
  { code: 'GP', name: 'Guadalupe', dialCode: '+590', flag: '🇬🇵' },
  { code: 'GU', name: 'Guam', dialCode: '+1671', flag: '🇬🇺' },
  { code: 'GT', name: 'Guatemala', dialCode: '+502', flag: '🇬🇹' },
  { code: 'GG', name: 'Guernsey', dialCode: '+44', flag: '🇬🇬' },
  { code: 'GY', name: 'Guiana', dialCode: '+592', flag: '🇬🇾' },
  { code: 'GF', name: 'Guiana Francesa', dialCode: '+594', flag: '🇬🇫' },
  { code: 'GN', name: 'Guiné', dialCode: '+224', flag: '🇬🇳' },
  { code: 'GQ', name: 'Guiné Equatorial', dialCode: '+240', flag: '🇬🇶' },
  { code: 'GW', name: 'Guiné-Bissau', dialCode: '+245', flag: '🇬🇼' },
  { code: 'HT', name: 'Haiti', dialCode: '+509', flag: '🇭🇹' },
  { code: 'NL', name: 'Holanda', dialCode: '+31', flag: '🇳🇱' },
  { code: 'HN', name: 'Honduras', dialCode: '+504', flag: '🇭🇳' },
  { code: 'HK', name: 'Hong Kong', dialCode: '+852', flag: '🇭🇰' },
  { code: 'HU', name: 'Hungria', dialCode: '+36', flag: '🇭🇺' },
  { code: 'YE', name: 'Iêmen', dialCode: '+967', flag: '🇾🇪' },
  { code: 'BV', name: 'Ilha Bouvet', dialCode: '+47', flag: '🇧🇻' },
  { code: 'IM', name: 'Ilha de Man', dialCode: '+44', flag: '🇮🇲' },
  { code: 'CX', name: 'Ilha do Natal', dialCode: '+61', flag: '🇨🇽' },
  { code: 'NF', name: 'Ilha Norfolk', dialCode: '+672', flag: '🇳🇫' },
  { code: 'AX', name: 'Ilhas Aland', dialCode: '+358', flag: '🇦🇽' },
  { code: 'KY', name: 'Ilhas Cayman', dialCode: '+1345', flag: '🇰🇾' },
  { code: 'CC', name: 'Ilhas Cocos', dialCode: '+61', flag: '🇨🇨' },
  { code: 'CK', name: 'Ilhas Cook', dialCode: '+682', flag: '🇨🇰' },
  { code: 'FO', name: 'Ilhas Faroe', dialCode: '+298', flag: '🇫🇴' },
  { code: 'FK', name: 'Ilhas Malvinas', dialCode: '+500', flag: '🇫🇰' },
  { code: 'MP', name: 'Ilhas Marianas do Norte', dialCode: '+1670', flag: '🇲🇵' },
  { code: 'MH', name: 'Ilhas Marshall', dialCode: '+692', flag: '🇲🇭' },
  { code: 'SB', name: 'Ilhas Salomão', dialCode: '+677', flag: '🇸🇧' },
  { code: 'TC', name: 'Ilhas Turks e Caicos', dialCode: '+1649', flag: '🇹🇨' },
  { code: 'VG', name: 'Ilhas Virgens Britânicas', dialCode: '+1284', flag: '🇻🇬' },
  { code: 'VI', name: 'Ilhas Virgens (EUA)', dialCode: '+1340', flag: '🇻🇮' },
  { code: 'IN', name: 'Índia', dialCode: '+91', flag: '🇮🇳' },
  { code: 'ID', name: 'Indonésia', dialCode: '+62', flag: '🇮🇩' },
  { code: 'IR', name: 'Irã', dialCode: '+98', flag: '🇮🇷' },
  { code: 'IQ', name: 'Iraque', dialCode: '+964', flag: '🇮🇶' },
  { code: 'IE', name: 'Irlanda', dialCode: '+353', flag: '🇮🇪' },
  { code: 'IS', name: 'Islândia', dialCode: '+354', flag: '🇮🇸' },
  { code: 'IL', name: 'Israel', dialCode: '+972', flag: '🇮🇱' },
  { code: 'IT', name: 'Itália', dialCode: '+39', flag: '🇮🇹' },
  { code: 'JM', name: 'Jamaica', dialCode: '+1876', flag: '🇯🇲' },
  { code: 'JP', name: 'Japão', dialCode: '+81', flag: '🇯🇵' },
  { code: 'JE', name: 'Jersey', dialCode: '+44', flag: '🇯🇪' },
  { code: 'JO', name: 'Jordânia', dialCode: '+962', flag: '🇯🇴' },
  { code: 'KW', name: 'Kuwait', dialCode: '+965', flag: '🇰🇼' },
  { code: 'LA', name: 'Laos', dialCode: '+856', flag: '🇱🇦' },
  { code: 'LS', name: 'Lesoto', dialCode: '+266', flag: '🇱🇸' },
  { code: 'LV', name: 'Letônia', dialCode: '+371', flag: '🇱🇻' },
  { code: 'LB', name: 'Líbano', dialCode: '+961', flag: '🇱🇧' },
  { code: 'LR', name: 'Libéria', dialCode: '+231', flag: '🇱🇷' },
  { code: 'LY', name: 'Líbia', dialCode: '+218', flag: '🇱🇾' },
  { code: 'LI', name: 'Liechtenstein', dialCode: '+423', flag: '🇱🇮' },
  { code: 'LT', name: 'Lituânia', dialCode: '+370', flag: '🇱🇹' },
  { code: 'LU', name: 'Luxemburgo', dialCode: '+352', flag: '🇱🇺' },
  { code: 'MO', name: 'Macau', dialCode: '+853', flag: '🇲🇴' },
  { code: 'MK', name: 'Macedônia do Norte', dialCode: '+389', flag: '🇲🇰' },
  { code: 'MG', name: 'Madagascar', dialCode: '+261', flag: '🇲🇬' },
  { code: 'MY', name: 'Malásia', dialCode: '+60', flag: '🇲🇾' },
  { code: 'MW', name: 'Malawi', dialCode: '+265', flag: '🇲🇼' },
  { code: 'MV', name: 'Maldivas', dialCode: '+960', flag: '🇲🇻' },
  { code: 'ML', name: 'Mali', dialCode: '+223', flag: '🇲🇱' },
  { code: 'MT', name: 'Malta', dialCode: '+356', flag: '🇲🇹' },
  { code: 'MA', name: 'Marrocos', dialCode: '+212', flag: '🇲🇦' },
  { code: 'MQ', name: 'Martinica', dialCode: '+596', flag: '🇲🇶' },
  { code: 'MU', name: 'Maurício', dialCode: '+230', flag: '🇲🇺' },
  { code: 'MR', name: 'Mauritânia', dialCode: '+222', flag: '🇲🇷' },
  { code: 'YT', name: 'Mayotte', dialCode: '+262', flag: '🇾🇹' },
  { code: 'MX', name: 'México', dialCode: '+52', flag: '🇲🇽' },
  { code: 'MM', name: 'Mianmar', dialCode: '+95', flag: '🇲🇲' },
  { code: 'FM', name: 'Micronésia', dialCode: '+691', flag: '🇫🇲' },
  { code: 'MZ', name: 'Moçambique', dialCode: '+258', flag: '🇲🇿' },
  { code: 'MD', name: 'Moldávia', dialCode: '+373', flag: '🇲🇩' },
  { code: 'MC', name: 'Mônaco', dialCode: '+377', flag: '🇲🇨' },
  { code: 'MN', name: 'Mongólia', dialCode: '+976', flag: '🇲🇳' },
  { code: 'ME', name: 'Montenegro', dialCode: '+382', flag: '🇲🇪' },
  { code: 'MS', name: 'Montserrat', dialCode: '+1664', flag: '🇲🇸' },
  { code: 'NA', name: 'Namíbia', dialCode: '+264', flag: '🇳🇦' },
  { code: 'NR', name: 'Nauru', dialCode: '+674', flag: '🇳🇷' },
  { code: 'NP', name: 'Nepal', dialCode: '+977', flag: '🇳🇵' },
  { code: 'NI', name: 'Nicarágua', dialCode: '+505', flag: '🇳🇮' },
  { code: 'NE', name: 'Níger', dialCode: '+227', flag: '🇳🇪' },
  { code: 'NG', name: 'Nigéria', dialCode: '+234', flag: '🇳🇬' },
  { code: 'NU', name: 'Niue', dialCode: '+683', flag: '🇳🇺' },
  { code: 'NO', name: 'Noruega', dialCode: '+47', flag: '🇳🇴' },
  { code: 'NC', name: 'Nova Caledônia', dialCode: '+687', flag: '🇳🇨' },
  { code: 'NZ', name: 'Nova Zelândia', dialCode: '+64', flag: '🇳🇿' },
  { code: 'OM', name: 'Omã', dialCode: '+968', flag: '🇴🇲' },
  { code: 'PW', name: 'Palau', dialCode: '+680', flag: '🇵🇼' },
  { code: 'PS', name: 'Palestina', dialCode: '+970', flag: '🇵🇸' },
  { code: 'PA', name: 'Panamá', dialCode: '+507', flag: '🇵🇦' },
  { code: 'PG', name: 'Papua Nova Guiné', dialCode: '+675', flag: '🇵🇬' },
  { code: 'PK', name: 'Paquistão', dialCode: '+92', flag: '🇵🇰' },
  { code: 'PY', name: 'Paraguai', dialCode: '+595', flag: '🇵🇾' },
  { code: 'PE', name: 'Peru', dialCode: '+51', flag: '🇵🇪' },
  { code: 'PF', name: 'Polinésia Francesa', dialCode: '+689', flag: '🇵🇫' },
  { code: 'PL', name: 'Polônia', dialCode: '+48', flag: '🇵🇱' },
  { code: 'PT', name: 'Portugal', dialCode: '+351', flag: '🇵🇹' },
  { code: 'PR', name: 'Porto Rico', dialCode: '+1787', flag: '🇵🇷' },
  { code: 'KE', name: 'Quênia', dialCode: '+254', flag: '🇰🇪' },
  { code: 'KG', name: 'Quirguistão', dialCode: '+996', flag: '🇰🇬' },
  { code: 'GB', name: 'Reino Unido', dialCode: '+44', flag: '🇬🇧' },
  { code: 'CF', name: 'República Centro-Africana', dialCode: '+236', flag: '🇨🇫' },
  { code: 'CD', name: 'República Democrática do Congo', dialCode: '+243', flag: '🇨🇩' },
  { code: 'DO', name: 'República Dominicana', dialCode: '+1809', flag: '🇩🇴' },
  { code: 'CZ', name: 'República Tcheca', dialCode: '+420', flag: '🇨🇿' },
  { code: 'RE', name: 'Reunião', dialCode: '+262', flag: '🇷🇪' },
  { code: 'RO', name: 'Romênia', dialCode: '+40', flag: '🇷🇴' },
  { code: 'RW', name: 'Ruanda', dialCode: '+250', flag: '🇷🇼' },
  { code: 'RU', name: 'Rússia', dialCode: '+7', flag: '🇷🇺' },
  { code: 'EH', name: 'Saara Ocidental', dialCode: '+212', flag: '🇪🇭' },
  { code: 'WS', name: 'Samoa', dialCode: '+685', flag: '🇼🇸' },
  { code: 'AS', name: 'Samoa Americana', dialCode: '+1684', flag: '🇦🇸' },
  { code: 'SM', name: 'San Marino', dialCode: '+378', flag: '🇸🇲' },
  { code: 'SH', name: 'Santa Helena', dialCode: '+290', flag: '🇸🇭' },
  { code: 'LC', name: 'Santa Lúcia', dialCode: '+1758', flag: '🇱🇨' },
  { code: 'KN', name: 'São Cristóvão e Nevis', dialCode: '+1869', flag: '🇰🇳' },
  { code: 'ST', name: 'São Tomé e Príncipe', dialCode: '+239', flag: '🇸🇹' },
  { code: 'VC', name: 'São Vicente e Granadinas', dialCode: '+1784', flag: '🇻🇨' },
  { code: 'SN', name: 'Senegal', dialCode: '+221', flag: '🇸🇳' },
  { code: 'SL', name: 'Serra Leoa', dialCode: '+232', flag: '🇸🇱' },
  { code: 'RS', name: 'Sérvia', dialCode: '+381', flag: '🇷🇸' },
  { code: 'SC', name: 'Seychelles', dialCode: '+248', flag: '🇸🇨' },
  { code: 'SG', name: 'Singapura', dialCode: '+65', flag: '🇸🇬' },
  { code: 'SX', name: 'Sint Maarten', dialCode: '+1721', flag: '🇸🇽' },
  { code: 'SY', name: 'Síria', dialCode: '+963', flag: '🇸🇾' },
  { code: 'SO', name: 'Somália', dialCode: '+252', flag: '🇸🇴' },
  { code: 'LK', name: 'Sri Lanka', dialCode: '+94', flag: '🇱🇰' },
  { code: 'SD', name: 'Sudão', dialCode: '+249', flag: '🇸🇩' },
  { code: 'SS', name: 'Sudão do Sul', dialCode: '+211', flag: '🇸🇸' },
  { code: 'SE', name: 'Suécia', dialCode: '+46', flag: '🇸🇪' },
  { code: 'CH', name: 'Suíça', dialCode: '+41', flag: '🇨🇭' },
  { code: 'SR', name: 'Suriname', dialCode: '+597', flag: '🇸🇷' },
  { code: 'SJ', name: 'Svalbard e Jan Mayen', dialCode: '+47', flag: '🇸🇯' },
  { code: 'TH', name: 'Tailândia', dialCode: '+66', flag: '🇹🇭' },
  { code: 'TW', name: 'Taiwan', dialCode: '+886', flag: '🇹🇼' },
  { code: 'TJ', name: 'Tajiquistão', dialCode: '+992', flag: '🇹🇯' },
  { code: 'TZ', name: 'Tanzânia', dialCode: '+255', flag: '🇹🇿' },
  { code: 'IO', name: 'Território Britânico do Oceano Índico', dialCode: '+246', flag: '🇮🇴' },
  { code: 'TF', name: 'Terras Austrais Francesas', dialCode: '+262', flag: '🇹🇫' },
  { code: 'TL', name: 'Timor-Leste', dialCode: '+670', flag: '🇹🇱' },
  { code: 'TG', name: 'Togo', dialCode: '+228', flag: '🇹🇬' },
  { code: 'TK', name: 'Tokelau', dialCode: '+690', flag: '🇹🇰' },
  { code: 'TO', name: 'Tonga', dialCode: '+676', flag: '🇹🇴' },
  { code: 'TT', name: 'Trinidad e Tobago', dialCode: '+1868', flag: '🇹🇹' },
  { code: 'TN', name: 'Tunísia', dialCode: '+216', flag: '🇹🇳' },
  { code: 'TR', name: 'Turquia', dialCode: '+90', flag: '🇹🇷' },
  { code: 'TM', name: 'Turcomenistão', dialCode: '+993', flag: '🇹🇲' },
  { code: 'TV', name: 'Tuvalu', dialCode: '+688', flag: '🇹🇻' },
  { code: 'UA', name: 'Ucrânia', dialCode: '+380', flag: '🇺🇦' },
  { code: 'UG', name: 'Uganda', dialCode: '+256', flag: '🇺🇬' },
  { code: 'UY', name: 'Uruguai', dialCode: '+598', flag: '🇺🇾' },
  { code: 'UZ', name: 'Uzbequistão', dialCode: '+998', flag: '🇺🇿' },
  { code: 'VU', name: 'Vanuatu', dialCode: '+678', flag: '🇻🇺' },
  { code: 'VA', name: 'Vaticano', dialCode: '+379', flag: '🇻🇦' },
  { code: 'VE', name: 'Venezuela', dialCode: '+58', flag: '🇻🇪' },
  { code: 'VN', name: 'Vietnã', dialCode: '+84', flag: '🇻🇳' },
  { code: 'WF', name: 'Wallis e Futuna', dialCode: '+681', flag: '🇼🇫' },
  { code: 'ZM', name: 'Zâmbia', dialCode: '+260', flag: '🇿🇲' },
  { code: 'ZW', name: 'Zimbábue', dialCode: '+263', flag: '🇿🇼' },
];

interface CountryPhoneInputProps {
  value: string;
  onChange: (phone: string, countryCode: string) => void;
  error?: string;
}

export function CountryPhoneInput({ value, onChange, error }: CountryPhoneInputProps) {
  const [selectedCountry, setSelectedCountry] = useState<Country>(
    COUNTRIES.find(c => c.code === 'BR') || COUNTRIES[0]
  );
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  useEffect(() => {
    if (value.startsWith('+')) {
      const matchedCountry = COUNTRIES.find(c => value.startsWith(c.dialCode));
      if (matchedCountry) {
        setSelectedCountry(matchedCountry);
        setPhoneNumber(value.substring(matchedCountry.dialCode.length));
      }
    }
  }, [value]);

  const handleCountryChange = (country: Country) => {
    setSelectedCountry(country);
    setIsOpen(false);
    setSearchTerm('');
    onChange(country.dialCode + phoneNumber.replace(/\D/g, ''), country.code);
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let input = e.target.value.replace(/\D/g, '');
    
    if (e.target.value.startsWith('+')) {
      const matchedCountry = COUNTRIES.find(c => e.target.value.startsWith(c.dialCode));
      if (matchedCountry) {
        setSelectedCountry(matchedCountry);
        input = e.target.value.substring(matchedCountry.dialCode.length).replace(/\D/g, '');
      }
    }

    if (selectedCountry.code === 'BR') {
      if (input.length <= 2) {
        input = input;
      } else if (input.length <= 7) {
        input = `(${input.slice(0, 2)}) ${input.slice(2)}`;
      } else if (input.length <= 11) {
        input = `(${input.slice(0, 2)}) ${input.slice(2, 7)}-${input.slice(7)}`;
      } else {
        input = `(${input.slice(0, 2)}) ${input.slice(2, 7)}-${input.slice(7, 11)}`;
      }
    }

    setPhoneNumber(input);
    const cleanPhone = input.replace(/\D/g, '');
    onChange(selectedCountry.dialCode + cleanPhone, selectedCountry.code);
  };

  const filteredCountries = COUNTRIES.filter(country =>
    country.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    country.dialCode.includes(searchTerm) ||
    country.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-text-light-secondary dark:text-text-dark-secondary">
        Telefone
      </label>
      
      <div className="flex gap-2">
        <div className="w-48 relative" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-border-light dark:border-border-dark rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-text-light-primary dark:text-text-dark-primary transition-all outline-none flex items-center justify-between gap-2"
          >
            <span className="flex items-center gap-2 truncate">
              <img 
                src={`https://flagcdn.com/24x18/${selectedCountry.code.toLowerCase()}.png`}
                srcSet={`https://flagcdn.com/48x36/${selectedCountry.code.toLowerCase()}.png 2x, https://flagcdn.com/72x54/${selectedCountry.code.toLowerCase()}.png 3x`}
                width="24"
                height="18"
                alt={`${selectedCountry.name} flag`}
                className="flex-shrink-0"
              />
              <span className="text-sm font-medium">{selectedCountry.code}</span>
              <span className="text-xs text-text-light-secondary dark:text-text-dark-secondary">
                {selectedCountry.dialCode}
              </span>
            </span>
            <span className={`material-symbols-outlined text-sm transition-transform ${isOpen ? 'rotate-180' : ''}`}>
              expand_more
            </span>
          </button>

          {isOpen && (
            <div className="absolute z-50 w-full mt-2 bg-white dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-lg shadow-2xl">
              <div className="p-2 border-b border-border-light dark:border-border-dark">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Buscar país..."
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-border-light dark:border-border-dark rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-primary outline-none"
                  autoFocus
                />
              </div>
              <div className="max-h-64 overflow-y-auto">
                {filteredCountries.map((country) => (
                  <button
                    key={country.code}
                    type="button"
                    onClick={() => handleCountryChange(country)}
                    className={`w-full px-4 py-2.5 text-left hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors flex items-center gap-3 ${
                      selectedCountry.code === country.code ? 'bg-primary/10 dark:bg-primary/20' : ''
                    }`}
                  >
                    <img 
                      src={`https://flagcdn.com/24x18/${country.code.toLowerCase()}.png`}
                      srcSet={`https://flagcdn.com/48x36/${country.code.toLowerCase()}.png 2x, https://flagcdn.com/72x54/${country.code.toLowerCase()}.png 3x`}
                      width="24"
                      height="18"
                      alt={`${country.name} flag`}
                      className="flex-shrink-0"
                    />
                    <span className="text-sm font-medium text-text-light-primary dark:text-text-dark-primary flex-1 truncate">
                      {country.name}
                    </span>
                    <span className="text-xs text-text-light-secondary dark:text-text-dark-secondary flex-shrink-0">
                      {country.dialCode}
                    </span>
                  </button>
                ))}
                {filteredCountries.length === 0 && (
                  <div className="px-4 py-8 text-center text-sm text-text-light-secondary dark:text-text-dark-secondary">
                    Nenhum país encontrado
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="flex-1 relative min-w-0">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-text-light-secondary dark:text-text-dark-secondary font-medium text-sm">
            {selectedCountry.dialCode}
          </div>
          <input
            type="tel"
            value={phoneNumber}
            onChange={handlePhoneChange}
            placeholder={selectedCountry.code === 'BR' ? '(11) 99999-9999' : '999999999'}
            className={`w-full pl-16 pr-4 py-3 bg-gray-50 dark:bg-gray-800 border ${
              error ? 'border-red-500' : 'border-border-light dark:border-border-dark'
            } rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-text-light-primary dark:text-text-dark-primary placeholder-gray-400 dark:placeholder-gray-500 transition-all outline-none`}
          />
        </div>
      </div>

      {error && (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      )}
    </div>
  );
}
