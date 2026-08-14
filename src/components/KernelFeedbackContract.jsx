import React, { useState } from "react";
import { MessageSquareHeart } from "lucide-react";
import { recordWellnessFeedback } from "../utilities/wellnessExchange";

const CONTRACTS = {
  smoothie: {
    title: "Smoothie experience contract",
    questions: [
      ["taste", "How did it taste?", ["Disliked", "Okay", "Enjoyed"]],
      ["texture", "How was the texture?", ["Needs work", "Okay", "Just right"]],
      ["later", "How did you feel a couple of hours later?", ["Worse", "No change", "Good"]],
      ["intention", "Did you notice support in the area you blended it for?", ["No", "Unsure", "Yes"]],
    ],
  },
  meals: {
    title: "Meal experience contract",
    questions: [
      ["taste", "How did the meal taste?", ["Disliked", "Okay", "Enjoyed"]],
      ["satisfaction", "How satisfying was it?", ["Not enough", "Okay", "Satisfied"]],
      ["later", "How were your comfort and energy a couple of hours later?", ["Worse", "No change", "Good"]],
      ["intention", "Did you notice support for the meal-plan goal?", ["No", "Unsure", "Yes"]],
    ],
  },
  frequency: {
    title: "Frequency experience contract",
    questions: [
      ["comfort", "How comfortable was the listening experience?", ["Uncomfortable", "Neutral", "Comfortable"]],
      ["during", "How did you feel during or just after listening?", ["Worse", "No change", "Good"]],
      ["later", "How did you feel a couple of hours later?", ["Worse", "No change", "Good"]],
      ["intention", "Did it support the intended relaxation or reflection experience?", ["No", "Unsure", "Yes"]],
    ],
  },
  taiChi: {
    title: "Tai Chi experience contract",
    questions: [
      ["comfort", "How comfortable did the movements feel?", ["Uncomfortable", "Manageable", "Comfortable"]],
      ["movement", "How did balance, mobility, or ease of movement feel afterward?", ["Worse", "No change", "Better"]],
      ["later", "How did you feel a couple of hours later?", ["Worse", "No change", "Good"]],
      ["intention", "Did the practice support your selected focus?", ["No", "Unsure", "Yes"]],
    ],
  },
};

export default function KernelFeedbackContract({ kernel, scope, selection, ingredients = [], disabled = false }) {
  const contract = CONTRACTS[kernel];
  const [answers, setAnswers] = useState({});
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState("");
  if (!contract) return null;
  const complete = contract.questions.every(([key]) => answers[key]);

  function submit(event) {
    event.preventDefault();
    if (!complete || disabled) return;
    const positiveAnswers = ["Enjoyed", "Just right", "Good", "Yes", "Satisfied", "Comfortable", "Better"];
    const positive = Object.values(answers).filter((answer) => positiveAnswers.includes(answer)).length;
    recordWellnessFeedback(scope, kernel, {
      sentiment: positive >= 2 ? "positive" : "negative",
      selection,
      ingredients,
      experience: answers,
      notes,
      source: "kernel-feedback-contract",
    });
    setStatus("Thank you. Astra saved this as your personal experience and will use it as a soft preference when safe.");
  }

  return (
    <section className="kernel-feedback-contract" aria-labelledby={`${kernel}-feedback-title`}>
      <details>
        <summary><MessageSquareHeart size={19} /><span><strong id={`${kernel}-feedback-title`}>{contract.title}</strong><small>Help Nature's Elixirz learn what works for you</small></span></summary>
        <form onSubmit={submit}>
          <p className="feedback-contract-boundary">Share your experience after using this selection. Your answers guide personalization; they do not confirm that a health condition was treated.</p>
          {contract.questions.map(([key, question, choices]) => (
            <fieldset key={key}><legend>{question}</legend><div className="feedback-choice-row">{choices.map((choice) => <label key={choice}><input type="radio" name={`${kernel}-${key}`} value={choice} checked={answers[key] === choice} onChange={() => setAnswers((current) => ({ ...current, [key]: choice }))} /> <span>{choice}</span></label>)}</div></fieldset>
          ))}
          <label className="feedback-notes">Anything else you want Astra to remember?<textarea maxLength={500} value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Optional taste, comfort, timing, or preparation notes" /></label>
          <button type="submit" className="ne-primary" disabled={!complete || disabled}>Send feedback</button>
          {status && <p className="learning-feedback-status" role="status">{status}</p>}
        </form>
      </details>
    </section>
  );
}
