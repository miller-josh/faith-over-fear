import type { Appearance } from '@clerk/types';

// Maps Clerk's UI to the Modernist tokens: zero radius, Archivo, translucent
// blue accent, ink text on the accent field (never white), flush-left labels.
export const clerkAppearance: Appearance = {
  variables: {
    colorPrimary: 'rgba(19, 42, 236, 0.5)',
    colorText: '#201e1d',
    colorTextOnPrimaryBackground: '#201e1d',
    colorBackground: '#f3f2f2',
    colorInputBackground: '#eae9e9',
    colorInputText: '#201e1d',
    borderRadius: '0px',
    fontFamily: 'Archivo, system-ui, sans-serif',
  },
  elements: {
    card: { boxShadow: 'none', backgroundColor: 'transparent' },
    headerTitle: { fontWeight: 800, letterSpacing: '-0.015em' },
    formButtonPrimary: {
      color: '#201e1d',
      textTransform: 'none',
      fontWeight: 800,
      justifyContent: 'flex-start',
    },
    socialButtonsBlockButton: { justifyContent: 'flex-start' },
    footer: { display: 'none' },
  },
};

// A square (zero-radius) avatar for the nav UserButton.
export const userButtonAppearance: Appearance = {
  variables: { borderRadius: '0px', fontFamily: 'Archivo, system-ui, sans-serif' },
  elements: {
    userButtonAvatarBox: { width: '30px', height: '30px', borderRadius: '0px' },
    userButtonAvatarImage: { borderRadius: '0px' },
  },
};
