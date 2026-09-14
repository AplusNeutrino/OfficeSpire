export class ReconnectController {
  private attempts = 0;

  nextDelay(): number {
    this.attempts += 1;
    return Math.min(this.attempts * 1000, 10000);
  }

  reset() {
    this.attempts = 0;
  }
}
