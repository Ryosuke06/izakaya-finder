type Props = {
  key: string;
  name: string;
  website: string | undefined;
  googleMap: string | undefined;
  score: number;
  reasons: string[];
};

export default function ResultCard(params: Props) {
  return (
    <>
      <div
        key={params.key}
        className="bg-neutral-primary-soft block  p-6 border border-default rounded-base shadow-xs hover:bg-neutral-secondary-medium"
      >
        <h5 className="mb-3 text-2xl font-semibold tracking-tight text-heading leading-8">
          {params.name}
        </h5>
        <div className="text-body">
          <ul>
            <li>score: {params.score}</li>
            <li>
              website: <a href={params.website}>website</a>
            </li>
            <li>
              googleMap: <a href={params.googleMap}>googleMapsUrl</a>
            </li>
            <div className="pt-3">
              <li>
                reason:
                <ul>
                  {params.reasons.map((reason) => {
                    return <li>{reason}</li>;
                  })}
                </ul>
              </li>
            </div>
          </ul>
        </div>
      </div>
    </>
  );
}
