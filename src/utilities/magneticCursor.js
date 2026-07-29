// PERFECT FIX — ensures React sees this as a real function:
export function applyMagneticEffect(selector = ".magnetic") {
  const elements = document.querySelectorAll(selector);

  if (!elements || elements.length === 0) return;

  elements.forEach((el) => {
    const strength = parseFloat(el.getAttribute("data-strength")) || 25;

    const handleMove = (e) => {
      const rect = el.getBoundingClientRect();
      const relX = e.clientX - rect.left - rect.width / 2;
      const relY = e.clientY - rect.top - rect.height / 2;

      el.style.transform = `translate(${relX / strength}px, ${relY / strength}px)`;
    };

    const reset = () => {
      el.style.transform = "translate(0px, 0px)";
    };

    el.addEventListener("mousemove", handleMove);
    el.addEventListener("mouseleave", reset);
  });
}

