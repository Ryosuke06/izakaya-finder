import { RecommendationItem } from "@/ai-api/schemas/izakaya";

type Props = {
  params: Promise<RecommendationItem>;
};

export default function reaultCard({ params }: Props) {}
