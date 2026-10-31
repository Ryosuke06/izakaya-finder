import { findSearchResultById } from "@/src/app/lib/server/izakayaSearch/searchRepository";
import ResultCard from "./components/result_card";
import { notFound } from "next/navigation";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function Results({ params }: Props) {
  const { id } = await params;
  const search = await findSearchResultById(id);

  if (!search) {
    notFound();
  }

  return (
    <>
      <main>
        <h1 className="text-xl m-5">結果</h1>

        <p className="m-5">{search.result.summary}</p>

        <div className="grid gap-3">
          {search.result.ranked.map((result) => (
            <ResultCard
              key={result.placeId}
              name={result.name}
              website={result.meta.website}
              googleMap={result.meta.googleMapsUri}
              score={result.score}
              reasons={result.reasons}
              address={result.address}
            />
          ))}
        </div>
      </main>
    </>
  );
}
