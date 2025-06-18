const smoothies = {
  energy: {
    ingredients: ['banana', 'spinach', 'chia seeds'],
    frequency: '528Hz',
    audioUrl: 'https://example.com/audio/528Hz.mp3'
  },
  detox: {
    ingredients: ['lemon', 'ginger', 'cucumber'],
    frequency: '432Hz',
    audioUrl: 'https://example.com/audio/432Hz.mp3'
  }
};

export default function generateSmoothie(goals) {
  const selected = smoothies[goals[0]];
  return {
    name: goals[0].toUpperCase() + " Smoothie",
    ingredients: selected.ingredients,
    frequency: selected.frequency,
    audioUrl: selected.audioUrl
  };
}