import { CharacterClass, Race, Gender } from '../types';

// Generic Clean Fantasy Character Artwork (Male & Female)
import fighterMalePortrait from '../assets/images/fighter_male_portrait_1786914888274.jpg';
import fighterFemalePortrait from '../assets/images/fighter_female_portrait_1786914901953.jpg';
import wizardMalePortrait from '../assets/images/wizard_male_portrait_1786914915756.jpg';
import wizardFemalePortrait from '../assets/images/wizard_female_portrait_1786914927439.jpg';
import rogueMalePortrait from '../assets/images/rogue_male_portrait_1786914941528.jpg';
import rogueFemalePortrait from '../assets/images/rogue_female_portrait_1786914955235.jpg';
import clericMalePortrait from '../assets/images/cleric_male_portrait_1786914968723.jpg';
import clericFemalePortrait from '../assets/images/cleric_female_portrait_1786914981005.jpg';
import druidMalePortrait from '../assets/images/druid_male_portrait_1786914997400.jpg';
import druidFemalePortrait from '../assets/images/druid_female_portrait_1786915012867.jpg';
import warlockMalePortrait from '../assets/images/warlock_male_portrait_1786915025462.jpg';
import warlockFemalePortrait from '../assets/images/warlock_female_portrait_1786915038988.jpg';
import barbarianMalePortrait from '../assets/images/barbarian_male_portrait_1786915052252.jpg';
import barbarianFemalePortrait from '../assets/images/barbarian_female_portrait_1786915065637.jpg';
import bardMalePortrait from '../assets/images/bard_male_portrait_1786915078485.jpg';
import bardFemalePortrait from '../assets/images/bard_female_portrait_1786915092449.jpg';
import adventurerMalePortrait from '../assets/images/adventurer_male_portrait_1786915106514.jpg';
import adventurerFemalePortrait from '../assets/images/adventurer_female_portrait_1786915120059.jpg';

export interface PresetPortraitOption {
  id: string;
  label: string;
  url: string;
  category: 'Martial' | 'Arcane' | 'Divine' | 'Stealth' | 'Nature' | 'Adventurer';
  gender: 'male' | 'female';
  classMatch?: CharacterClass | 'Adventurer';
}

export const PRESET_PORTRAITS: PresetPortraitOption[] = [
  // Fighter
  {
    id: 'fighter-male',
    label: 'Fighter (Male)',
    url: fighterMalePortrait,
    category: 'Martial',
    gender: 'male',
    classMatch: 'Fighter',
  },
  {
    id: 'fighter-female',
    label: 'Fighter (Female)',
    url: fighterFemalePortrait,
    category: 'Martial',
    gender: 'female',
    classMatch: 'Fighter',
  },

  // Wizard
  {
    id: 'wizard-male',
    label: 'Wizard (Male)',
    url: wizardMalePortrait,
    category: 'Arcane',
    gender: 'male',
    classMatch: 'Wizard',
  },
  {
    id: 'wizard-female',
    label: 'Wizard (Female)',
    url: wizardFemalePortrait,
    category: 'Arcane',
    gender: 'female',
    classMatch: 'Wizard',
  },

  // Rogue
  {
    id: 'rogue-male',
    label: 'Rogue (Male)',
    url: rogueMalePortrait,
    category: 'Stealth',
    gender: 'male',
    classMatch: 'Rogue',
  },
  {
    id: 'rogue-female',
    label: 'Rogue (Female)',
    url: rogueFemalePortrait,
    category: 'Stealth',
    gender: 'female',
    classMatch: 'Rogue',
  },

  // Cleric
  {
    id: 'cleric-male',
    label: 'Cleric (Male)',
    url: clericMalePortrait,
    category: 'Divine',
    gender: 'male',
    classMatch: 'Cleric',
  },
  {
    id: 'cleric-female',
    label: 'Cleric (Female)',
    url: clericFemalePortrait,
    category: 'Divine',
    gender: 'female',
    classMatch: 'Cleric',
  },

  // Druid
  {
    id: 'druid-male',
    label: 'Druid (Male)',
    url: druidMalePortrait,
    category: 'Nature',
    gender: 'male',
    classMatch: 'Druid',
  },
  {
    id: 'druid-female',
    label: 'Druid (Female)',
    url: druidFemalePortrait,
    category: 'Nature',
    gender: 'female',
    classMatch: 'Druid',
  },

  // Warlock
  {
    id: 'warlock-male',
    label: 'Warlock (Male)',
    url: warlockMalePortrait,
    category: 'Arcane',
    gender: 'male',
    classMatch: 'Warlock',
  },
  {
    id: 'warlock-female',
    label: 'Warlock (Female)',
    url: warlockFemalePortrait,
    category: 'Arcane',
    gender: 'female',
    classMatch: 'Warlock',
  },

  // Barbarian
  {
    id: 'barbarian-male',
    label: 'Barbarian (Male)',
    url: barbarianMalePortrait,
    category: 'Martial',
    gender: 'male',
    classMatch: 'Barbarian',
  },
  {
    id: 'barbarian-female',
    label: 'Barbarian (Female)',
    url: barbarianFemalePortrait,
    category: 'Martial',
    gender: 'female',
    classMatch: 'Barbarian',
  },

  // Bard
  {
    id: 'bard-male',
    label: 'Bard (Male)',
    url: bardMalePortrait,
    category: 'Arcane',
    gender: 'male',
    classMatch: 'Bard',
  },
  {
    id: 'bard-female',
    label: 'Bard (Female)',
    url: bardFemalePortrait,
    category: 'Arcane',
    gender: 'female',
    classMatch: 'Bard',
  },

  // Generic Adventurer
  {
    id: 'adventurer-male',
    label: 'Adventurer (Male)',
    url: adventurerMalePortrait,
    category: 'Adventurer',
    gender: 'male',
    classMatch: 'Adventurer',
  },
  {
    id: 'adventurer-female',
    label: 'Adventurer (Female)',
    url: adventurerFemalePortrait,
    category: 'Adventurer',
    gender: 'female',
    classMatch: 'Adventurer',
  },
];

/**
 * Auto-generates a clean, classic fantasy character profile picture based on race, class, name, and gender.
 */
export function getAutoGeneratedPortrait(
  race: Race,
  characterClass: CharacterClass,
  name: string = 'Hero',
  gender?: Gender
): string {
  const isFemale = gender === 'Female';

  switch (characterClass) {
    case 'Fighter':
      return isFemale ? fighterFemalePortrait : fighterMalePortrait;
    case 'Paladin':
      return isFemale ? fighterFemalePortrait : fighterMalePortrait;
    case 'Barbarian':
      return isFemale ? barbarianFemalePortrait : barbarianMalePortrait;
    case 'Wizard':
      return isFemale ? wizardFemalePortrait : wizardMalePortrait;
    case 'Sorcerer':
      return isFemale ? wizardFemalePortrait : wizardMalePortrait;
    case 'Warlock':
      return isFemale ? warlockFemalePortrait : warlockMalePortrait;
    case 'Cleric':
      return isFemale ? clericFemalePortrait : clericMalePortrait;
    case 'Druid':
      return isFemale ? druidFemalePortrait : druidMalePortrait;
    case 'Rogue':
      return isFemale ? rogueFemalePortrait : rogueMalePortrait;
    case 'Ranger':
      return isFemale ? rogueFemalePortrait : rogueMalePortrait;
    case 'Monk':
      return isFemale ? adventurerFemalePortrait : adventurerMalePortrait;
    case 'Bard':
      return isFemale ? bardFemalePortrait : bardMalePortrait;
    default:
      return isFemale ? adventurerFemalePortrait : adventurerMalePortrait;
  }
}

/**
 * Resizes an uploaded image file using HTML5 Canvas to 512x512 pixels
 * compressed as JPEG (quality 0.85) to target ~100-150KB optimal profile picture size.
 */
export function resizeImageToPortrait(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('Selected file is not an image.'));
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const TARGET_SIZE = 512; // 512x512 square profile picture
        canvas.width = TARGET_SIZE;
        canvas.height = TARGET_SIZE;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Failed to create canvas context'));
          return;
        }

        // Calculate aspect fill crop
        const minDim = Math.min(img.width, img.height);
        const sx = (img.width - minDim) / 2;
        const sy = (img.height - minDim) / 2;

        ctx.drawImage(img, sx, sy, minDim, minDim, 0, 0, TARGET_SIZE, TARGET_SIZE);

        // Compress as JPEG at 85% quality (~100-150KB file size)
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        resolve(dataUrl);
      };
      img.onerror = () => reject(new Error('Failed to load image file.'));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error('Failed to read image file.'));
    reader.readAsDataURL(file);
  });
}

