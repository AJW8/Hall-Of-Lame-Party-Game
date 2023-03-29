var states = {
	LOBBY: 0,
	INTRO: 1,
	ROUND_INTRO: 2,
	NOMINATE_PLAYERS1: 3,
	NOMINATE_PLAYERS2: 4,
	SELECT_TITLES: 5,
	CONTEST_TITLE: 6,
	VOTE_NOMINEES: 7,
	TITLE_VOTES: 8,
	TITLE_SCORES: 9,
	SCORES_UNSORTED: 10,
	SCORES_SORTED: 11,
	WINNER: 12,
	END: 13
};

function GameView(){
	var state = false;
	var name = false;
	var playerIndex = false;
	var finalRound = false;
	var currentTitle = false;
	var nominees = false;
	var currentNominee = false;
	var title1 = false;
	var title2 = false;
	var titlesLeft = false;
	var contested = false;
	var voteRank = false;
	var firstPlaceVote = false;
	var secondPlaceVote = false;
	
	this.init = function(){
		this.initSocket();
		this.bindViewEvents();
		this.bindSocketEvents();
		socket.emit('game_init');
	}
	
	this.initSocket = function(){
		socket = io.connect({
			'reconnection':true,
			'reconnectionDelay': 1000,
			'reconnectionDelayMax' : 1000,
			'reconnectionAttempts': 1000
		});
	}
	
	this.updateData = function(data){
		state = data.state;
		if(!name) name = data.name;
		if(!playerIndex) playerIndex = data.player_index;
		finalRound = data.final_round;
		currentTitle = data.current_title;
		nominees = data.nominees;
		if(name && !(playerIndex === false)){
			currentNominee = data.current_nominee;
			title1 = data.title1;
			title2 = data.title2;
			titlesLeft = data.titles_left;
			contested = data.contested;
		}
		voteRank = data.vote_rank;
		this.updateView();
	}
	
	this.updateView = function(){
		$("#title").html("<b>" + (name ? name : "AUDIENCE") + "</b>");
		$("#finished_task").hide();
		$("#contested").hide();
		$("#my_title").hide();
		$("#voted").hide();
		var idle = true;
		if(state == states.LOBBY){
			idle = false;
			$("#lobby").show();
		}
		else $("#lobby").hide();
		if((state == states.NOMINATE_PLAYERS1 || state == states.NOMINATE_PLAYERS2) && name && !(playerIndex === false)){
			idle = false;
			if(currentTitle){
				$("#nominate_player").show();
				$("#nominate_prompt").html("<p>Most likely to: " + currentTitle + "</p><p>" + (state == states.NOMINATE_PLAYERS1 ? "Choose a player to nominate for this title." : (playerIndex == currentNominee ? "You have already been nominated for this title" : "The following player has already been nominated for this title: " + nominees[currentNominee]) + ".</p><p>Choose a second player to nominate for it.") + "</p>");
				for(let i = 0; i < nominees.length; i++){
					const button = "btn_nominate_player" + (i + 1);
					if(i == playerIndex || !(currentNominee === false) && i == currentNominee) $("#" + button).hide();
					else{
						$("#" + button).show();
						$("#" + button).html(nominees[i]);
					}
				}
				for(let i = nominees.length + 1; i < 9; i++) $("#btn_nominate_player" + i).hide();
			}
			else{
				$("#nominate_player").hide();
				$("#finished_task").show();
			}
		}
		else $("#nominate_player").hide();
		if(state == states.SELECT_TITLES && name && !(playerIndex === false)){
			idle = false;
			if(title1 && title2){
				$("#select_title").show();
				$("#btn_select_title1").html("Most likely to: " + title1);
				$("#btn_select_title2").html("Most likely to: " + title2);
			}
			else{
				$("#select_title").hide();
				$("#finished_task").show();
			}
		}
		else $("#select_title").hide();
		if(state == states.CONTEST_TITLE && name && !(playerIndex === false)){
			if(currentNominee === true){
				idle = false;
				$("#contest_title").hide();
				$("#my_title").show();
			}
			else if(contested){
				idle = false;
				$("#contest_title").hide();
				$("#contested").show();
			}
			else if(titlesLeft){
				idle = false;
				$("#contest_title").show();
				$("#contest_prompt").html("<p>Most likely to: " + currentTitle + "</p><p>You can contest " + (titlesLeft > 1 ? titlesLeft + " more titles." : "1 more title.") + "</p>");
			}
		}
		else $("#contest_title").hide();
		if(state == states.VOTE_NOMINEES){
			idle = false;
			if(voteRank){
				$("#vote").show();
				$("#vote_prompt").html("<p>Most likely to: " + currentTitle + "</p>" + (name && !(playerIndex === false) && finalRound ? "<p>Vote for your #" + voteRank + " pick!</p>" : ""));
				for(let i = 0; i < nominees.length; i++){
					const button = "#btn_vote" + (i + 1);
					if(nominees[i] && (firstPlaceVote === false || i != firstPlaceVote) && (secondPlaceVote === false || i != secondPlaceVote)){
						$(button).show();
						$(button).html(nominees[i]);
					}
					else $(button).hide();
				}
				for(let i = nominees.length + 1; i < 9; i++) $("#btn_vote" + i).hide();
			}
			else{
				$("#vote").hide();
				$("#voted").show();
			}
		}
		else{
			firstPlaceVote = false;
			secondPlaceVote = false;
			$("#vote").hide();
		}
		if(state == states.END){
			idle = false;
			$("#end").show();
		}
		else $("#end").hide();
		if(idle) $("#idle").show();
		else $("#idle").hide();
	}
	
	this.submitNomination = function(nominee){
		if(!name || playerIndex === false || !currentTitle) return;
		socket.emit('game_submit_nomination', nominee);
		currentTitle = false;
		this.updateView();
	}
	
	this.submitVote = function(vote){
		if(!voteRank || !nominees || !nominees[vote] || (!(firstPlaceVote === false) && vote == firstPlaceVote) || (!(secondPlaceVote === false) && vote == secondPlaceVote)) return;
		socket.emit('game_submit_vote', vote);
		voteRank = false;
		if(firstPlaceVote === false) firstPlaceVote = vote;
		else if(secondPlaceVote === false) secondPlaceVote = vote;
		this.updateView();
	}
	
	this.bindViewEvents = function(){
		$('#btn_nominate_player1').click(function(game){
			return function(){
				game.submitNomination(0);
				return false;
			}
		}(this));
		$('#btn_nominate_player2').click(function(game){
			return function(){
				game.submitNomination(1);
				return false;
			}
		}(this));
		$('#btn_nominate_player3').click(function(game){
			return function(){
				game.submitNomination(2);
				return false;
			}
		}(this));
		$('#btn_nominate_player4').click(function(game){
			return function(){
				game.submitNomination(3);
				return false;
			}
		}(this));
		$('#btn_nominate_player5').click(function(game){
			return function(){
				game.submitNomination(4);
				return false;
			}
		}(this));
		$('#btn_nominate_player6').click(function(game){
			return function(){
				game.submitNomination(5);
				return false;
			}
		}(this));
		$('#btn_nominate_player7').click(function(game){
			return function(){
				game.submitNomination(6);
				return false;
			}
		}(this));
		$('#btn_nominate_player8').click(function(game){
			return function(){
				game.submitNomination(7);
				return false;
			}
		}(this));
		$('#btn_select_title1').click(function(game){
			return function(){
				if(title1) socket.emit('game_select_title', title1);
				title1 = false;
				title2 = false;
				game.updateView();
				return false;
			}
		}(this));
		$('#btn_select_title2').click(function(game){
			return function(){
				if(title2) socket.emit('game_select_title', title2);
				title1 = false;
				title2 = false;
				game.updateView();
				return false;
			}
		}(this));
		$('#btn_contest_title').click(function(game){
			return function(){
				socket.emit('game_contest_title');
				contested = true;
				game.updateView();
				return false;
			}
		}(this));
		$('#btn_vote1').click(function(game){
			return function(){
				game.submitVote(0);
				return false;
			}
		}(this));
		$('#btn_vote2').click(function(game){
			return function(){
				game.submitVote(1);
				return false;
			}
		}(this));
		$('#btn_vote3').click(function(game){
			return function(){
				game.submitVote(2);
				return false;
			}
		}(this));
		$('#btn_vote4').click(function(game){
			return function(){
				game.submitVote(3);
				return false;
			}
		}(this));
		$('#btn_vote5').click(function(game){
			return function(){
				game.submitVote(4);
				return false;
			}
		}(this));
		$('#btn_vote6').click(function(game){
			return function(){
				game.submitVote(5);
				return false;
			}
		}(this));
		$('#btn_vote7').click(function(game){
			return function(){
				game.submitVote(6);
				return false;
			}
		}(this));
		$('#btn_vote8').click(function(game){
			return function(){
				game.submitVote(7);
				return false;
			}
		}(this));
	}
	
	this.bindSocketEvents = function(){
		socket.on('game_init_ok', function(game){
			return function(data){
				game.updateData(data);
				return false;
			}
		}(this));
		socket.on('game_init_nok', function(){
			alert('You were disconnected.');
			location.href = '/';
		});
		socket.on('game_state_update', function(game){
			return function(data){
				if(state != data.state) game.updateData(data);
				return false;
			}
		}(this));
		socket.on('game_check_audience_connection', function(){
			socket.emit('game_verify_audience_connection');
		});
		socket.on('game_set_vote_rank', function(game){
			return function(rank){
				if(state != states.VOTE_NOMINEES) return false;
				voteRank = rank;
				game.updateView();
				return false;
			}
		}(this));
	}
}

$(document).ready(function(){
	var game = new GameView();
	game.init();
});