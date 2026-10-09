// Copy for the "Cómo usarlo" / "How to use" tab of the simulator. Server-side only: it is rendered
// into the page at build time and never shipped as script. Numbers here are the model's fixed rules
// (thresholds, defaults), never results: results change with the data, so the guide describes how to
// read them instead of quoting them.
//
// Where each statement comes from: "Metodología del modelo" (see README, "Documentación del modelo").

export interface GuideSection {
  id: string;
  title: string;
  paragraphs?: string[];
  steps?: { title: string; text: string }[];
  terms?: { term: string; text: string }[];
  bullets?: string[];
  after?: string;
}

export interface Guide {
  tab: string;
  sections: GuideSection[];
}

export const GUIDE: Record<'es' | 'en', Guide> = {
  es: {
    tab: 'Cómo usarlo',
    sections: [
      {
        id: 'what',
        title: 'Qué hace el simulador',
        paragraphs: [
          'Compara, año a año entre 2027 y 2036, seguir como hoy con pasar a un manejo eco-regenerativo en una finca tipo del Altiplano Estepario. Trabaja con siete fincas tipo —combinaciones de cultivo y manejo de partida, todas de secano— y calcula solo lo que cambia al hacer la transición.',
          'Responde a cuatro preguntas: cuánto cuesta, cuánta financiación hace falta y cuándo, si la finca podría devolver un préstamo con su propia caja y cuánto suma todo eso en el conjunto del paisaje.',
        ],
      },
      {
        id: 'steps',
        title: 'Empieza en cuatro pasos',
        steps: [
          {
            title: 'Elige la finca',
            text: 'En «Cultivo» y «Manejo actual» escoge el cultivo principal (almendro, olivar, pistacho o cereal) y si hoy se maneja de forma convencional o ecológica. El pistacho solo existe como convencional.',
          },
          {
            title: 'Elige el tipo de transición',
            text: 'La «transición certificada» incluye todas las prácticas, inversiones y servicios, y la certificación ecológica y regenerativa; con ella pueden cobrarse la ayuda de agricultura ecológica, la prima ecológica y un sobreprecio regenerativo. La «mejora de gestión» es un paquete ligero —cubierta espontánea, triturado de poda, gestión integrada de plagas, leguminosas en el cereal y seguimiento— sin inversiones, sin certificación y sin primas.',
          },
          {
            title: 'Ajusta el tamaño',
            text: 'Por defecto entra en transición la finca tipo entera: 10 ha de almendro, 8 de olivar, 15 de pistacho o 25 de cereal. Puedes cambiar el tamaño de la finca y las hectáreas en transición; el resto sigue como hoy. Convertir pocas hectáreas sale proporcionalmente más caro, porque parte del diseño del plan y de la certificación se paga una vez por finca.',
          },
          {
            title: 'Elige escenario y ayudas',
            text: '«Pesimista», «Central» u «Optimista» llevan todos los supuestos a la vez a su valor desfavorable, intermedio o favorable. «Ayudas PAC» indica qué parte de las ayudas de la PAC (ecorregímenes y agricultura ecológica) se da por cobrada: 100 %, 50 % o 0 %.',
          },
        ],
        after: 'Las cifras se recalculan al instante cada vez que cambias algo.',
      },
      {
        id: 'tabs',
        title: 'Qué encuentras en cada pestaña',
        terms: [
          {
            term: 'Finca tipo',
            text: 'Cuatro cifras clave —coste bruto de la transición, necesidad máxima de financiación, resultado neto a diez años y año de recuperación—, dos gráficos y, debajo, el detalle año a año, que puedes abrir y cerrar. Con «Ver en» cambias entre euros por finca y euros por hectárea.',
          },
          {
            term: 'Crédito',
            text: 'Si la finca podría devolver un préstamo. Ajusta el porcentaje financiado con deuda, el tipo de interés, el plazo y la carencia; el simulador compara cada año la caja disponible con la cuota (el DSCR) y marca si cumple el umbral de 1,2×, una referencia habitual.',
          },
          {
            term: 'Paisaje',
            text: 'Lo mismo a escala del territorio. Fija cuántas hectáreas de cada cultivo hay y qué parte entra en transición en diez años (la captación); las fincas entran de forma escalonada. Verás las hectáreas en transición, el coste bruto, la necesidad de financiación y la demanda potencial de crédito. No depende de la finca tipo que hayas elegido arriba.',
          },
          {
            term: 'Supuestos',
            text: 'Lo que hay detrás de las cifras. «Qué pesa más» ordena los supuestos según cuánto mueven el resultado; «Todos los supuestos» los lista con su valor, rango, fuente y confianza; «Datos de referencia» reúne los costes de las prácticas, los módulos de diversificación, el precio de la almendra y las trayectorias año a año.',
          },
          {
            term: 'Supuestos de ingresos',
            text: 'La barra que hay encima de las pestañas resume los precios en uso. Con «Ajustar» cambias el precio del cultivo, el sobreprecio regenerativo, los pagos por servicios ecosistémicos y la diversificación. Afecta a todas las pestañas; pon un valor a 0 para quitarlo.',
          },
        ],
      },
      {
        id: 'read',
        title: 'Cómo leer los números',
        paragraphs: [
          'Todo se mide como diferencia frente a seguir como hoy: un valor positivo mejora la situación de partida y uno negativo la empeora. En gráficos y tablas, el rojo es una pérdida o un coste, el verde una ganancia y el azul un dato de apoyo.',
        ],
        terms: [
          {
            term: 'Coste bruto',
            text: 'Lo que cuestan las prácticas, los servicios, las inversiones y las pérdidas de rendimiento, sin restar ingresos ni ahorros.',
          },
          {
            term: 'Necesidad máxima de financiación',
            text: 'El punto más bajo del acumulado: lo que la finca tiene que adelantar antes de que la transición se pague sola. Es la base para dimensionar un préstamo.',
          },
          {
            term: 'Resultado neto y VAN',
            text: 'El neto a diez años es la suma de todos los años. El VAN lo expresa en valor de hoy, con una tasa de descuento (6 % en el caso central).',
          },
          {
            term: 'Año de recuperación',
            text: 'El primer año a partir del cual el acumulado ya no vuelve a ser negativo. Si no llega en diez años, así se indica.',
          },
          {
            term: 'DSCR',
            text: 'La caja disponible de la finca dividida por la cuota del préstamo, año a año. Por encima del umbral, la finca cubre la cuota con holgura; por debajo, no.',
          },
          {
            term: 'Captación',
            text: 'La parte de la superficie de cada cultivo que entra en transición en diez años: 25 % en el caso central.',
          },
          {
            term: 'Confianza',
            text: 'Alta, media o baja: cuánto respaldo tiene un dato. Los datos oficiales o de lonja suelen tener confianza alta; las estimaciones del equipo, baja.',
          },
        ],
      },
      {
        id: 'limits',
        title: 'Qué tener en cuenta',
        paragraphs: [
          'El simulador sirve para entender órdenes de magnitud y comparar opciones. No es una previsión de lo que ocurrirá en una finca concreta ni una oferta de crédito.',
        ],
        bullets: [
          'Los rendimientos y los costes son medias de Andalucía, no del Altiplano. Es la mayor fuente de incertidumbre, sobre todo en el margen actual y, por tanto, en la capacidad de repago.',
          'Es un presupuesto parcial: solo calcula lo que cambia con la transición. No incluye otros cultivos ni ganadería, impuestos ni inflación; todo está en euros constantes.',
          '«Pesimista» y «Optimista» son rangos de estrés, no probabilidades: mueven todos los supuestos a la vez.',
          'Los pagos por servicios ecosistémicos, como el carbono, están a 0 por defecto porque hoy no hay mercado en el territorio. Para el caso más prudente, pon también el sobreprecio regenerativo a 0.',
          'El pistacho se modela como plantación adulta, sin los primeros años de implantación sin producción.',
        ],
        after:
          'Cada supuesto indica su fuente y su confianza en «Supuestos → Todos los supuestos», y la fecha de los datos aparece al pie de esa pestaña. El precio de la almendra de la semana se lee de la Lonja de Murcia.',
      },
    ],
  },
  en: {
    tab: 'How to use',
    sections: [
      {
        id: 'what',
        title: 'What the simulator does',
        paragraphs: [
          'It compares, year by year between 2027 and 2036, carrying on as today with moving to eco-regenerative management on a typical farm in the Altiplano Estepario. It works with seven typical farms —combinations of crop and starting management, all rainfed— and calculates only what changes when the transition happens.',
          'It answers four questions: how much it costs, how much financing is needed and when, whether the farm could repay a loan from its own cash, and what all of that adds up to across the landscape.',
        ],
      },
      {
        id: 'steps',
        title: 'Start in four steps',
        steps: [
          {
            title: 'Pick the farm',
            text: 'In “Crop” and “Current management” choose the main crop (almond, olive, pistachio or cereal) and whether it is managed conventionally or organically today. Pistachio only exists as conventional.',
          },
          {
            title: 'Pick the transition type',
            text: '“Certified transition” includes all the practices, investments and services, plus organic and regenerative certification; with it, the organic farming payment, the organic premium and a regenerative price premium can be earned. “Management improvement” is a light package —spontaneous cover, pruning chipping, integrated pest management, legumes in cereal and monitoring— with no investments, no certification and no premiums.',
          },
          {
            title: 'Set the size',
            text: 'By default the whole typical farm goes into transition: 10 ha of almond, 8 of olive, 15 of pistachio or 25 of cereal. You can change the farm size and the hectares in transition; the rest carries on as today. Converting few hectares costs proportionally more, because part of the plan design and certification is paid once per farm.',
          },
          {
            title: 'Pick the scenario and support',
            text: '“Pessimistic”, “Central” or “Optimistic” move all the assumptions at once to their unfavourable, middle or favourable value. “CAP support” sets how much of the CAP payments (eco-schemes and organic farming) is assumed to be received: 100%, 50% or 0%.',
          },
        ],
        after: 'The figures recalculate instantly every time you change something.',
      },
      {
        id: 'tabs',
        title: 'What you find in each tab',
        terms: [
          {
            term: 'Typical farm',
            text: 'Four key figures —gross cost of the transition, maximum financing need, net result over ten years and recovery year—, two charts and, below, the year-by-year detail, which you can open and close. “Show in” switches between euros per farm and euros per hectare.',
          },
          {
            term: 'Credit',
            text: 'Whether the farm could repay a loan. Set the share financed with debt, the interest rate, the term and the grace period; the simulator compares the available cash with the repayment each year (the DSCR) and shows whether it meets the 1.2× threshold, a common reference.',
          },
          {
            term: 'Landscape',
            text: 'The same at the scale of the territory. Set how many hectares of each crop there are and how much of it enters transition within ten years (the uptake); farms join in stages. You will see the hectares in transition, the gross cost, the financing need and the potential credit demand. It does not depend on the typical farm chosen above.',
          },
          {
            term: 'Assumptions',
            text: 'What sits behind the figures. “What matters most” ranks the assumptions by how much they move the result; “All assumptions” lists them with their value, range, source and confidence; “Reference data” gathers practice costs, the diversification modules, the almond price and the year-by-year trajectories.',
          },
          {
            term: 'Income assumptions',
            text: 'The bar above the tabs summarises the prices in use. With “Adjust” you change the crop price, the regenerative premium, the payments for ecosystem services and the diversification. It affects every tab; set a value to 0 to remove it.',
          },
        ],
      },
      {
        id: 'read',
        title: 'How to read the numbers',
        paragraphs: [
          'Everything is measured as a difference from carrying on as today: a positive value improves the starting position and a negative one worsens it. In charts and tables, red is a loss or a cost, green a gain and blue supporting information.',
        ],
        terms: [
          {
            term: 'Gross cost',
            text: 'What the practices, services, investments and yield losses cost, before subtracting income or savings.',
          },
          {
            term: 'Maximum financing need',
            text: 'The lowest point of the cumulative total: what the farm has to put up before the transition pays for itself. It is the basis for sizing a loan.',
          },
          {
            term: 'Net result and NPV',
            text: 'The ten-year net is the sum of all the years. The NPV expresses it in today’s money, using a discount rate (6% in the central case).',
          },
          {
            term: 'Recovery year',
            text: 'The first year from which the cumulative total no longer goes negative again. If it does not happen within ten years, it says so.',
          },
          {
            term: 'DSCR',
            text: 'The farm’s available cash divided by the loan repayment, year by year. Above the threshold the farm covers the repayment with room to spare; below it, it does not.',
          },
          {
            term: 'Uptake',
            text: 'The share of each crop’s area that enters transition within ten years: 25% in the central case.',
          },
          {
            term: 'Confidence',
            text: 'High, medium or low: how well supported a figure is. Official or auction-market data usually have high confidence; the team’s estimates, low.',
          },
        ],
      },
      {
        id: 'limits',
        title: 'What to keep in mind',
        paragraphs: [
          'The simulator is for understanding orders of magnitude and comparing options. It is not a forecast of what will happen on a particular farm, nor a credit offer.',
        ],
        bullets: [
          'Yields and costs are Andalusian averages, not Altiplano ones. This is the biggest source of uncertainty, especially in current margin and therefore in repayment capacity.',
          'It is a partial budget: it only calculates what changes with the transition. It leaves out other crops and livestock, taxes and inflation; everything is in constant euros.',
          '“Pessimistic” and “Optimistic” are stress ranges, not probabilities: they move all the assumptions at once.',
          'Payments for ecosystem services, such as carbon, are set to 0 by default because there is no market for them in the territory today. For the most prudent case, also set the regenerative premium to 0.',
          'Pistachio is modelled as an adult orchard, without the first years of establishment before it produces.',
        ],
        after:
          'Each assumption shows its source and confidence under “Assumptions → All assumptions”, and the data date appears at the foot of that tab. The almond price for the current week is read from the Lonja de Murcia.',
      },
    ],
  },
};
