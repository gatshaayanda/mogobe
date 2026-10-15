import Link from "next/link";

export default function OfflinePage() {
  return (
    <main className="mogobeInnerPage">
      <section className="mogobeSuccess">
        <span className="mogobeSuccessIcon" aria-hidden="true">↯</span>
        <span className="mogobeEyebrow">OFFLINE MODE</span>
        <h1>You’re still<br/><em>with Mogobe.</em></h1>
        <p>Some catalogue content may be available on this device, but prices and availability can change.</p>
        <div className="mogobePendingNotice">
          <strong>Checkout needs a connection.</strong>
          <span>Your basket and order request are not sent until you reconnect and Mogobe confirms the request.</span>
        </div>
        <Link className="mogobePrimaryButton" href="/">Return to the counter ↗</Link>
      </section>
    </main>
  );
}
