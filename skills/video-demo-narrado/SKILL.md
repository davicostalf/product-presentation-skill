---
name: video-demo-narrado
description: Produzir um vídeo de demonstração narrado de um protótipo web (slides + gravação de tela de desktop e celular + narração gravada pela própria pessoa), do roteiro à exportação final. Use quando alguém pedir para fazer, revisar ou remontar um vídeo de demo, um storyboard, um teleprompter para gravar, ou para tratar e sincronizar uma narração com telas de protótipo.
---

# Vídeo de demo narrado

Um vídeo curto que apresenta algo construído num protótipo: slides para o que não é tela e gravações do protótipo, em desktop e celular lado a lado, para o que é experiência. Quem apresenta grava a própria voz, e o vídeo é montado em volta dela.

Termos usados aqui:
- **Roteiro:** o texto que será falado, dividido em seções e trechos.
- **Narração:** a gravação da voz lendo o roteiro.

## Artefatos

Cada um tem uma fonte única, e os outros derivam dela.

| Artefato | Fonte | Para quê |
|---|---|---|
| Roteiro | um arquivo de texto por seções (ex.: `roteiro.json`) | gera o teleprompter, as notas dos slides e as falas do storyboard |
| Slides | um HTML por slide, com as animações declaradas | blocos que não são protótipo |
| Storyboard | gerado do roteiro + capturas | revisão: uma tela por trecho de fala, com a fala exata embaixo |
| Teleprompter | gerado do roteiro | gravação da narração |
| Narração | gravação da pessoa, tratada e cortada | base do tempo do vídeo |
| Diretrizes do projeto | um arquivo vivo com as decisões de quem pede | referência de toda rodada |
| Vídeo | montagem de slides, capturas e narração | entrega |

## Fluxo

1. Escolher o **tipo de vídeo** (abaixo).
2. Escrever o **roteiro** no formato do tipo.
3. Preparar **slides** e o **protótipo** para cada trecho.
4. Montar o **storyboard** e revisar até aprovar.
5. Gravar a **narração** pelo teleprompter.
6. **Tratar e cortar** o áudio.
7. **Capturar e montar** o vídeo de revisão.
8. **Verificar**.
9. **Exportar** o final.

Itere no storyboard, não no vídeo: ali, mudar texto, tela ou ordem custa minutos. A narração só é gravada com o storyboard aprovado, para não regravar quando o roteiro muda.

## Tipos de vídeo

O tipo define para quem é, a duração, a sequência de blocos e as regras próprias de roteiro e de slide. O projeto só preenche o conteúdo.

### Proposta de produto para liderança

Para apresentar uma direção a quem decide. Essa pessoa já conhece o problema e quer ver a experiência. 5 a 8 minutos.

**Sequência:**
1. **Capa.** Título da proposta. A saudação ao destinatário fica na fala, não no slide.
2. **Problema**, em 1 ou 2 slides, rápido:
   - uma captura da experiência atual numa loja real, com 2 ou 3 anotações numeradas presas a pontos da captura (o número aparece na captura e antes de cada frase);
   - um dado que mostra o que se ganha resolvendo (por exemplo, a conversão de uma busca específica contra uma genérica), em barras, com uma frase de leitura.
3. **Premissas**, de 2 a 4, um slide para cada. Cada slide tem título, uma frase e uma ilustração animada feita com os componentes reais do protótipo, mostrando a premissa acontecer (antes e depois, com cursor). A animação é disparada pela fala, não roda em loop.
4. **Casos no protótipo**, 3 ou 4, em progressão de esforço para o usuário: do jeito que ele já usa hoje até o pedido mais elaborado. O primeiro caso não exige aprender nada novo. Cada caso tem uma capa: fundo cinza, "Caso N de M" num canto e o que a pessoa manda ("Uma palavra", "Link", "Foto e frase", "Documento"), nunca um grau de dificuldade.
5. **Proposta**, em 1 slide: uma frase-síntese no título e 3 cards com o que o usuário ganha. O título de cada card é um verbo com sujeito implícito (por exemplo, "Descreve o que precisa como preferir"), sem tom de marketing. Os cards entram um por trecho de fala.
6. **Contracapa.** Só a marca. Sobre ela, o próximo passo concreto (com quem será alinhado) e a despedida.

**Roteiro:**
- Pouco tempo no problema, mais tempo nos casos.
- Separar o que existe hoje do que se propõe.
- Mencionar o que acontece por trás (por exemplo, vários agentes) na premissa certa, sem detalhar a implementação.
- Sem pergunta ao destinatário no fim.

**Slides:**
- Estilo da marca: sem trecho de título em cinza, sem contador de slides, sem caixa-alta, conteúdo principal fora da faixa inferior.
- Respiro entre os elementos e nenhuma quebra de texto ruim.

### Outros tipos

Um tipo novo (tutorial de funcionalidade, release para clientes) entra aqui no mesmo formato: para quem, duração, sequência e regras próprias de roteiro e de slide.

## Roteiro

Regras que valem para qualquer tipo:

- **Escrito para ser falado.** Soa como improviso de quem apresenta, nunca como texto polido. Não use:
  - ganchos de efeito ou frases de landing page;
  - "resumindo" ou enumerações forçadas;
  - frases com intercalação e pausa no meio.

  Ponha a oração principal primeiro e a explicação depois.
- **Conectores naturais** entre as ideias, para nada soar truncado.
- **Afirmar só o que a tela mostra** e o que foi conferido. Toda ação mostrada é falada, e tudo o que é falado aparece.
- **Uma frase por trecho de tela.** A frase dita sobre uma capa termina na capa, e a tela seguinte começa com frase nova.
- **Idioma:** num vídeo em português, usar a palavra em português quando ela é comum ("usuário", não "user"; "carrinho", não "cart"). Termos sem equivalente usual ficam no original.
- **Nomes de pessoas** sem artigo ("Ana", não "a Ana").
- **Palavras neutras para ideias neutras**, e nada de exagero ("esse hábito está mudando", não "desaprendendo").
- **Depois da gravação**, trazer para o roteiro o que a pessoa melhorou ao falar.

## Storyboard

- Um quadro por trecho de fala (uma frase ou parte dela), com a fala exata embaixo e uma etiqueta descrevendo a tela.
- Desktop e celular lado a lado nos quadros do protótipo.
- Slides com animação têm um quadro por estado, no trecho em que esse estado entra.
- Verificação automática: o texto de todos os quadros, concatenado, é igual ao roteiro.
- Imagens embutidas, num arquivo único que abre offline.

## Gravação da narração

- **Teleprompter** gerado do roteiro, com uma frase destacada por vez e as seções marcadas.
  - Ritmo padrão de cerca de 120 palavras por minuto, ajustável durante a leitura.
  - O modo que segue a voz deve ser servido por `http://localhost`: aberto como `file://`, o navegador pede o microfone a cada religada.
- Gravar tudo num arquivo só, com uns 2 segundos de silêncio entre as seções.
- Para trocar uma frase depois, regravar só ela, no mesmo lugar e com o mesmo microfone.

## Tratamento do áudio

- **Tratamento leve, que preserva a voz:** passa-alta, remoção de cliques, redução de ruído suave, correção de picos, EQ sutil, compressão leve e normalização de loudness. Não mudar o tom nem a velocidade.
- **Cortes** em mínimos de energia, com fade curto. Depois de cortar, retranscrever a região e conferir que não sobrou pedaço de palavra.
- **Remover** falsos começos, repetições e silêncios longos. Manter respirações e pausas naturais.
- **Encaixe de frase regravada:** aplicar o mesmo tratamento, encaixar em mínimos de energia, transcrever só o trecho novo e remapear os tempos do resto.
- **Pausas extras** (para carregamento, anexo ou troca de seção) feitas com o silêncio de fundo tirado de trechos silenciosos da própria gravação.

## Sincronia e ritmo

Valem para o storyboard e para o vídeo.

- **A tela mostra a coisa de 0,3 a 0,8 segundo antes de a fala nomeá-la.** Nunca durante, nunca depois, nunca com a página ainda carregando.
- **Entre o fim de uma fala e uma troca de slide ou de seção, 2 a 3 segundos de pausa.** A troca nunca acontece durante a fala.
- Nada fica menos de 3 segundos na tela.
- **Elementos de slide:** os que não acompanham a fala já estão na tela quando o slide aparece. Os que acompanham entram na palavra que os nomeia.
- Com o campo preenchido, uma pausa curta antes de enviar.
- **Anexos** (foto, documento) aparecem uma vez, centralizados sobre as duas telas desfocadas e congeladas. O protótipo só age depois que o anexo some. A imagem é a mesma que aparece no campo e no resultado.
- **Cursor:**
  - desliza, nunca pula;
  - para apontar algo, para perto do elemento, nunca por cima de um que tenha ação de hover;
  - os trajetos contornam esses elementos;
  - no celular, um ponto de toque.
- Nada de foco chamativo, tooltip ou estado de hover que não faça parte da fala.

## Captura e montagem

- **Captura:** navegador real em tela virtual (por exemplo, Xvfb + Chromium + ffmpeg), roteirizado por script (por exemplo, Playwright) e dirigido pelos tempos das palavras da narração.
- **Gravar uma vez, na resolução final** (por exemplo, 1440p). Versões menores saem reduzidas do mesmo material.
- **Desktop e celular em paralelo**, em duas telas virtuais, no mesmo relógio.
- **Gravação por trecho dentro de cada caso** (busca, resultados, carrinho), com os segmentos codificados guardados. Uma mudança no protótipo regrava só o trecho afetado.
- **Sincronia se corrige na edição.** Se uma ação chega atrasada, entra uma pausa de silêncio de fundo no áudio antes da frase e um congelamento do mesmo tamanho no vídeo logo depois da ação. Não se regrava para isso.
- **Slides gravados ao vivo**, para as animações rodarem, com cada animação disparada pela palavra da fala.
- **Montagem por partes** codificadas separadamente e juntadas sem recodificar. Nunca um único grafo de filtros gigante.
- **Codificação:** rápida nas revisões; alta qualidade só na exportação final.

Tempos de referência:

| Ajuste | Tempo |
|---|---|
| Sincronia | ~10 min |
| Trecho de protótipo alterado | ~15 min |
| Remontagem completa | ~25 min |

## Verificação

- Um quadro por trecho de fala, em folhas de contato, conferido contra o storyboard antes da entrega.
- Sondas na página durante a captura (por exemplo, registrar a cada 50 ms se algum botão de hover está visível), para provar o que o olho não vê em miniatura.
- Pontos sensíveis:
  - tela carregada antes de a fala citá-la;
  - capas segurando a introdução do caso;
  - pausas nas trocas;
  - animações entrando nas palavras certas.

## Forma de trabalhar

- **Diretrizes do projeto como referência fixa:**
  - consultar antes de cada rodada e incluir nas instruções de quem executa;
  - atualizar a cada orientação nova;
  - registrar a regra, não a justificativa.
- **Prints** do que fica pronto, para quem pede validar com os próprios olhos.
- **Perguntas** com contexto completo e uma recomendação. Para decisões visuais, um experimento com as opções lado a lado.
- **Transcrições automáticas de reunião** não atribuem falas com confiabilidade. Não atribuir pontos a pessoas com base nelas.
