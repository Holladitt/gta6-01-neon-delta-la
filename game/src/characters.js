// The people of Neon Delta LA: Mara, the crew, and the ten contacts.

export const MARA = {
  name: 'Mara Solano',
  role: 'EX-GETAWAY DRIVER',
  color: '#ff5a5f',
  bio: 'Mara Solano used to drive anyone, anywhere, for the right price. Then her sister vanished with proof of corruption that reaches the mayor, the port, and the NDPD.',
};

export const CONTACTS = {
  'Eden Voss': { color: '#5aa9e6', line: 'You move quiet, you get paid quiet. That is the whole job.' },
  'Harlan Dray': { color: '#e6a35a', line: 'A sedan, no questions, no plates. Bring it to the yard.' },
  'Lucia Marlow': { color: '#b388eb', line: 'Three drops. The NDPD sweeps at dawn, so be quick.' },
  'Dante Kovac': { color: '#7bc96f', line: 'A tail that will not quit. Stay on it, then shake it off.' },
  'Sable Okonkwo': { color: '#e65a8a', line: 'The whole force is after you. Break the line.' },
  'Vera Lindqvist': { color: '#5ad1c4', line: 'A stash in the dark, a buyer at dawn. Do not mix them up.' },
  'Inez Vargas': { color: '#ffd166', line: 'The pier never sleeps. Two pages, and nobody sees me take them.' },
  'Orin Beck': { color: '#ff8c42', line: 'The drive is in my hand. Two dead drops, then the whole city hears it.' },
  'Lena Marsh': { color: '#6fb3e6', line: 'Hold the dock until the boat comes. Then bring the key home.' },
  'Elias Frost': { color: '#c9c9c9', line: 'One witness left, and the whole city wants him quiet. Run.' },
};

export function contactLine(name) {
  return (CONTACTS[name] && CONTACTS[name].line) || 'Drive. Do not stop.';
}

export function contactColor(name) {
  return (CONTACTS[name] && CONTACTS[name].color) || '#cccccc';
}
