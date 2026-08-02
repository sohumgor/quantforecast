import { formatCurrency, formatPercent } from "./format";

export interface ForecastSummaryInput {
  tickerSymbol: string;
  horizonLabel: string;
  medianPrice: number;
  lowPrice: number;
  highPrice: number;
  probPositiveReturn: number;
}

export interface ForecastSummary {
  paragraph: string;
  directionSentence: string;
}

function directionSentence(probUp: number): string {
  if (probUp >= 0.6) {
    return "While gains appear more likely, there is still a meaningful chance of downside, so this isn't a sure thing.";
  }
  if (probUp >= 0.45) {
    return "The odds are close to a coin flip, so this stock could reasonably move either direction from here.";
  }
  return "Our simulations actually lean toward a decline being somewhat more likely than a gain over this period.";
}

/** Builds the Simple-Mode hero paragraph entirely from already-computed
 * simulation output — every number in the sentence is a real, live value. */
export function buildForecastSummary(input: ForecastSummaryInput): ForecastSummary {
  const { tickerSymbol, horizonLabel, medianPrice, lowPrice, highPrice, probPositiveReturn } =
    input;
  const dir = directionSentence(probPositiveReturn);
  const leadClause =
    probPositiveReturn >= 0.5
      ? `our simulations suggest ${tickerSymbol} is more likely than not to rise`
      : `our simulations suggest ${tickerSymbol} is slightly more likely to fall than to rise`;

  const paragraph =
    `Based on thousands of simulations, ${leadClause} over the next ${horizonLabel.toLowerCase()}, ` +
    `with about a ${formatPercent(probPositiveReturn)} chance of finishing above today's price. ` +
    `Most simulated outcomes fall between ${formatCurrency(lowPrice)} and ${formatCurrency(highPrice)}, ` +
    `with a median forecast near ${formatCurrency(medianPrice)}. ${dir}`;

  return { paragraph, directionSentence: dir };
}
