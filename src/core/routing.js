/** Decide quais fornecedores podem atender à data solicitada. */
export function resolveProviders({ source = 'auto', date, today }) {
  const isCurrentDate = date === today;

  if (source === 'auto') {
    const selected = isCurrentDate ? ['cancaonova'] : ['dancrf'];
    return {
      providers: selected,
      routing: {
        strategy: 'automatic',
        selectedProvider: selected[0],
        brazilToday: today,
        reason: isCurrentDate
          ? 'A data solicitada é hoje no fuso America/Sao_Paulo.'
          : 'A data solicitada não é hoje; Canção Nova /cn não oferece consulta por data.'
      }
    };
  }

  if (source === 'both' && !isCurrentDate) {
    return {
      providers: ['dancrf'],
      routing: {
        strategy: 'both_requested_historical_fallback',
        selectedProvider: 'dancrf',
        brazilToday: today,
        reason: 'Canção Nova /cn só fornece a liturgia corrente; para esta data foi consultada Dancrf.'
      }
    };
  }

  const selected = source === 'both' ? ['cancaonova', 'dancrf'] : [source];
  return {
    providers: selected,
    routing: {
      strategy: 'explicit',
      selectedProvider: selected.length === 1 ? selected[0] : selected,
      brazilToday: today
    }
  };
}

export const VALID_SOURCES = Object.freeze(['auto', 'dancrf', 'cancaonova', 'both']);
export const VALID_MODES = Object.freeze(['faithful', 'editorial', 'both']);
export const VALID_OUTPUTS = Object.freeze(['continuous', 'sections', 'both']);
