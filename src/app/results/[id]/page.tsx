import { findSearchResultById } from "@/src/app/lib/server/izakayaSearch/searchRepository";
import ResultCard from "./components/result_card";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function Results({ params }: Props) {
  const { id } = await params;
  const search = await findSearchResultById(id);

  if (!search) {
    throw new Error(`${id}が示すリサーチ結果はありません`);
  }

  return (
    <>
      <main>
        <h1 className="text-xl m-5">結果</h1>

        {search.result.ranked.map((result) => (
          <ResultCard
            key={result.placeId}
            name={result.name}
            website={result.meta.website}
            googleMap={result.meta.googleMapsUrl}
            score={result.score}
            reasons={result.reasons}
          />
        ))}
      </main>
    </>
  );
}
