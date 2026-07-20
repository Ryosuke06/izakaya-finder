import { findSearchResultById } from "@/src/app/lib/server/izakayaSearch/searchRepository";

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
        <h2>結果</h2>

        {search.result.ranked.map((result) => (
          <>
            <p>{result.meta.rating}</p>
            <p>{result.meta.website}</p>
          </>
        ))}
      </main>
    </>
  );
}
