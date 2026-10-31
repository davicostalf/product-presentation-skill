# Ideias

Propostas em avaliação. Nada aqui é compromisso: uma ideia aprovada vira mudança na skill e entra no CHANGELOG.

## Estrutura

- **Apresentação de produto como centro, gravação como modo de entrega.** Reorganizar em: apresentação (tipos, roteiro, slides, demo do protótipo), ensaio (storyboard) e entrega, ao vivo ou gravada. O modo ao vivo cobriria notas do apresentador, ordem das telas e o protótipo preparado em cada estado.
- **Nome: `product-presentation`** para a skill, combinando com o repositório `product-presentation-skill`. "Product" delimita o assunto; "presentation" cobre apresentação conceitual, demo ao vivo, vídeo gravado e vídeo de landing page.

## Tipos novos

- **Apresentação conceitual de fluxo ou jornada.** Sem protótipo funcionando: o fluxo ou a jornada contados em etapas, com diagramas ou telas estáticas.
- **Vídeo de landing page.** 30 a 90 segundos, sem apresentador nem destinatário; abre pelo benefício, legendas para assistir sem som, chamada final; geralmente sem slides de contexto.

## Antes do roteiro

- **Entrevista inicial.** Levantar objetivo, público, pontos-chave e dados antes de escolher o tipo e escrever. Fonte: artigo do freeCodeCamp sobre Claude Code + Marp.
- **3 ou 4 mensagens-chave.** Definir o que o público deve lembrar, testar o roteiro contra elas e repeti-las no fechamento. Fonte: guia de Demo Day da YC; Duarte (Resonate).

## Roteiro

- **Orçamento de palavras por trecho.** Com ~120 palavras por minuto, calcular quanto cabe em cada bloco e checar o roteiro contra a duração-alvo do tipo. Fonte: `catalan-adobe/skills` (demo-narrate).
- **Cobertura derivada das mudanças.** Quando a demo mostra uma rodada de mudanças, listar o que mudou (diff ou changelog do produto) e garantir que cada item aparece no roteiro. Fonte: `jaobrown/demo-changes`.

## Slides

- **Verificação em camadas.** Texto provisório esquecido (lorem, TODO), arquivo válido e inspeção visual de cada slide, com uma lista de antipadrões de design (linha decorativa sob o título, texto centralizado, layouts idênticos repetidos, texto estourando). Fonte: skill `pptx` da Anthropic.

## Gravação e montagem

- **Ensaio da captura sem áudio.** Rodar a captura inteira antes da montagem final para validar ações e tempos. Fonte: `tomek-i/narrate-plugin`.
- **Troca de áudio sem recaptura.** Explicitar que regravar uma frase substitui só a faixa de áudio de um vídeo já montado. Fonte: `Avatechdir/video-walkthrough-skill`.
- **Capturas limpas dos estados-chave.** Exportar quadros sem cursor nem legenda, para documentação e slides. Fonte: `Avatechdir/video-walkthrough-skill`.

## Benchmark pendente

- Ler os SKILL.md completos de `presentation-builder`, `web-video-presentation`, `ted-talk`, `demo-narrate` e `narrate-plugin`.
- Olhar ferramentas comerciais de demo (Arcade, Supademo, Tella, Descript) e equivalentes em outros agentes (Cursor, Codex).
