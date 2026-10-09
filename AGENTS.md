<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Provisionamento e manutenção de usuários exigem papel administrativo/gerencial validado e cliente privilegiado no servidor; nunca usar cadastro público ou IDs artificiais como fallback, pois perfil e identidade precisam permanecer consistentes.

- Enrollment uses one global settings row and nullable per-course overrides; null follows the live default without rewriting courses.
- Use the shared commercial calculation for simulation and proposal creation; server reads authoritative fees and snapshots every price component so historical proposals remain unchanged.
- Enrollment and material changes are audited by database triggers; bulk enrollment updates use one transaction to prevent partial application.
- Render price breakdowns through the shared presentation component using saved snapshots for existing proposals; never infer historical fees from the current catalog.
