import React from "react";

export default class MealPlansErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { failed: false };
  }

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error) {
    console.error("Meal Plans render recovery activated", error);
  }

  render() {
    if (!this.state.failed) return this.props.children;

    return (
      <main className="meal-plan-recovery" role="alert">
        <p className="ne-kicker">Meal Plans recovery</p>
        <h1>Meal Plans couldn&apos;t finish loading.</h1>
        <p>Your saved profile, pantry, and plans are still intact. Reload this page to retry safely.</p>
        <button className="ne-primary" type="button" onClick={() => window.location.reload()}>
          Reload Meal Plans
        </button>
      </main>
    );
  }
}
