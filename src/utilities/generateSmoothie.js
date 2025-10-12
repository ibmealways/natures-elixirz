export default function generateSmoothie(selectedItems) {
  if (!selectedItems || selectedItems.length === 0) {
    return 'No ingredients selected — please pick your elixir!';
  }
  return `🍹 Your Elixir: ${selectedItems.join(", ")}`;
}
