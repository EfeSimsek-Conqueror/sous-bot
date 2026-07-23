import { Suspense } from "react";
import { ResultsView } from "./ResultsView";

export default function ResultsPage() {
  return (
    <Suspense fallback={null}>
      <ResultsView />
    </Suspense>
  );
}
