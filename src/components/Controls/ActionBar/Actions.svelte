<script>
	import { candidates } from '@sudoku/stores/candidates';
	import { userGrid, domainGame, canUndo, canRedo, isExploring, exploreDepth, isFailedPath } from '@sudoku/stores/grid';
	import { cursor } from '@sudoku/stores/cursor';
	import { hints } from '@sudoku/stores/hints';
	import { notes } from '@sudoku/stores/notes';
	import { settings } from '@sudoku/stores/settings';
	import { keyboardDisabled } from '@sudoku/stores/keyboard';
	import { gamePaused } from '@sudoku/stores/game';

	$: hintsAvailable = $hints > 0;

	function handleHint() {
		if (hintsAvailable) {
			if ($candidates.hasOwnProperty($cursor.x + ',' + $cursor.y)) {
				candidates.clear($cursor);
			}
			userGrid.applyHint($cursor);
		}
	}

    // 候选数提示功能
    function handleCandidateHint() {
        if ($cursor.x !== null && $cursor.y !== null) {
            const cands = domainGame.getCandidates($cursor.y, $cursor.x);
            alert(`Candidates for this cell (${$cursor.x + 1}, ${$cursor.y + 1}): [${cands.join(', ')}]`);
        }
    }
</script>

{#if $isFailedPath}
    <div class="w-full text-center text-red-600 font-bold mb-2">
        Conflict Detected / Failed Exploration Path!
    </div>
{/if}

<div class="action-buttons space-x-3">

    <button class="btn btn-round" disabled={$gamePaused || !$canUndo} on:click={() => domainGame.undo()} title="Undo">
		<svg class="icon-outline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
			<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
		</svg>
	</button>

    <button class="btn btn-round" disabled={$gamePaused || !$canRedo} on:click={() => domainGame.redo()} title="Redo">
		<svg class="icon-outline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
			<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 10h-10a8 8 0 00-8 8v2M21 10l-6 6m6-6l-6-6" />
		</svg>
	</button>

    <button class="btn btn-round" disabled={$keyboardDisabled || $userGrid[$cursor.y]?.[$cursor.x] !== 0} on:click={handleCandidateHint} title="Show Candidates">
        <svg class="icon-outline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
    </button>

	<button class="btn btn-round btn-badge" disabled={$keyboardDisabled || !hintsAvailable || $userGrid[$cursor.y]?.[$cursor.x] !== 0} on:click={handleHint} title="Hints ({$hints})">
		<svg class="icon-outline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
			<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
		</svg>
		{#if $settings.hintsLimited}
			<span class="badge" class:badge-primary={hintsAvailable}>{$hints}</span>
		{/if}
	</button>

</div>

<div class="mt-4 flex justify-center space-x-2">
    {#if $isExploring}
        <button class="btn btn-small btn-primary" on:click={() => domainGame.commitExplore()}>
            Commit (Depth: {$exploreDepth})
        </button>
        <button class="btn btn-small bg-red-400 text-white" on:click={() => domainGame.cancelExplore()}>
            Cancel Explore
        </button>
    {:else}
        <button class="btn btn-small" on:click={() => domainGame.startExplore()}>
            Explore Mode
        </button>
    {/if}
</div>

<style>
	.action-buttons {
		@apply flex flex-wrap justify-evenly self-end;
	}
	.btn-badge {
		@apply relative;
	}
	.badge {
		min-height: 20px;
		min-width:  20px;
		@apply p-1 rounded-full leading-none text-center text-xs text-white bg-gray-600 inline-block absolute top-0 left-0;
	}
	.badge-primary {
		@apply bg-primary;
	}
</style>