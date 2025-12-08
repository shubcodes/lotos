#!/usr/bin/env python3
"""
Text-Based Arcade Game Collection
A collection of classic arcade games that work in any terminal!
"""

import random
import sys
from typing import List, Tuple

class SnakeGame:
    """Classic Snake game"""
    
    def __init__(self, width=20, height=20):
        self.width = width
        self.height = height
        self.snake = [(width//2, height//2)]
        self.direction = (1, 0)  # Right
        self.food = self.generate_food()
        self.score = 0
        self.game_over = False
    
    def generate_food(self):
        """Generate food at random position"""
        while True:
            food = (random.randint(0, self.width-1), random.randint(0, self.height-1))
            if food not in self.snake:
                return food
    
    def move(self):
        """Move the snake"""
        if self.game_over:
            return
        
        head_x, head_y = self.snake[0]
        new_head = (head_x + self.direction[0], head_y + self.direction[1])
        
        # Check wall collision
        if (new_head[0] < 0 or new_head[0] >= self.width or
            new_head[1] < 0 or new_head[1] >= self.height):
            self.game_over = True
            return
        
        # Check self collision
        if new_head in self.snake:
            self.game_over = True
            return
        
        self.snake.insert(0, new_head)
        
        # Check food collision
        if new_head == self.food:
            self.score += 10
            self.food = self.generate_food()
        else:
            self.snake.pop()
    
    def change_direction(self, direction):
        """Change snake direction"""
        opposites = {
            (1, 0): (-1, 0),   # Right -> Left
            (-1, 0): (1, 0),   # Left -> Right
            (0, 1): (0, -1),   # Up -> Down
            (0, -1): (0, 1)    # Down -> Up
        }
        if opposites.get(self.direction) != direction:
            self.direction = direction
    
    def render(self):
        """Render the game board"""
        board = [[' ' for _ in range(self.width)] for _ in range(self.height)]
        
        # Draw food
        fx, fy = self.food
        board[fy][fx] = '🍎'
        
        # Draw snake
        for i, (x, y) in enumerate(self.snake):
            if i == 0:
                board[y][x] = '🐍'
            else:
                board[y][x] = '█'
        
        # Print board
        print('\n' + '═' * (self.width * 2 + 2))
        for row in reversed(board):
            print('║' + ''.join(f'{cell} ' for cell in row) + '║')
        print('═' * (self.width * 2 + 2))
        print(f"Score: {self.score}")
        if self.game_over:
            print("GAME OVER!")


class NumberGuesser:
    """Number guessing arcade game"""
    
    def __init__(self):
        self.number = random.randint(1, 100)
        self.guesses = 0
        self.max_guesses = 7
    
    def play(self):
        print("\n🎯 Number Guesser Arcade")
        print("=" * 50)
        print("I'm thinking of a number between 1 and 100!")
        print(f"You have {self.max_guesses} guesses. Good luck!\n")
        
        while self.guesses < self.max_guesses:
            try:
                guess = int(input(f"Guess #{self.guesses + 1}: "))
                self.guesses += 1
                
                if guess == self.number:
                    print(f"\n🎉 Congratulations! You guessed it in {self.guesses} tries!")
                    return True
                elif guess < self.number:
                    print("📈 Too low! Try higher.")
                else:
                    print("📉 Too high! Try lower.")
                
                remaining = self.max_guesses - self.guesses
                if remaining > 0:
                    print(f"   {remaining} guesses remaining\n")
            except ValueError:
                print("Please enter a valid number!")
        
        print(f"\n💀 Game Over! The number was {self.number}")
        return False


class RockPaperScissors:
    """Rock Paper Scissors arcade game"""
    
    def __init__(self):
        self.choices = ['rock', 'paper', 'scissors']
        self.wins = 0
        self.losses = 0
        self.ties = 0
    
    def play_round(self, player_choice):
        """Play a round"""
        player_choice = player_choice.lower()
        if player_choice not in self.choices:
            return None
        
        computer_choice = random.choice(self.choices)
        
        if player_choice == computer_choice:
            self.ties += 1
            return ('tie', player_choice, computer_choice)
        elif ((player_choice == 'rock' and computer_choice == 'scissors') or
              (player_choice == 'paper' and computer_choice == 'rock') or
              (player_choice == 'scissors' and computer_choice == 'paper')):
            self.wins += 1
            return ('win', player_choice, computer_choice)
        else:
            self.losses += 1
            return ('loss', player_choice, computer_choice)
    
    def get_stats(self):
        """Get game statistics"""
        total = self.wins + self.losses + self.ties
        if total == 0:
            return "No games played yet"
        return f"Wins: {self.wins}, Losses: {self.losses}, Ties: {self.ties}"


def main():
    """Main menu"""
    print("\n" + "=" * 70)
    print("🎮 TEXT ARCADE GAME COLLECTION")
    print("=" * 70)
    print("\nAvailable Games:")
    print("  1. Snake Game")
    print("  2. Number Guesser")
    print("  3. Rock Paper Scissors")
    print("  4. Exit")
    
    choice = input("\nSelect a game (1-4): ")
    
    if choice == '1':
        print("\n🐍 SNAKE GAME")
        print("=" * 50)
        print("Controls: Use arrow keys or WASD")
        print("Goal: Eat apples to grow and score points!")
        print("Avoid walls and yourself!")
        
        game = SnakeGame(15, 15)
        moves = [
            (1, 0),   # Right
            (0, 1),   # Up
            (0, 1),   # Up
            (-1, 0),  # Left
            (-1, 0),  # Left
            (0, -1),  # Down
            (0, -1),  # Down
            (1, 0),   # Right
        ]
        
        for i, move in enumerate(moves):
            if game.game_over:
                break
            game.change_direction(move)
            game.move()
            game.render()
            if i < len(moves) - 1:
                print("\nNext move...")
        
        if not game.game_over:
            print("\n✅ Demo completed! Score:", game.score)
    
    elif choice == '2':
        game = NumberGuesser()
        game.play()
    
    elif choice == '3':
        print("\n✂️  ROCK PAPER SCISSORS")
        print("=" * 50)
        game = RockPaperScissors()
        
        for _ in range(5):
            result = game.play_round(random.choice(['rock', 'paper', 'scissors']))
            if result:
                outcome, player, computer = result
                emoji_map = {'rock': '🪨', 'paper': '📄', 'scissors': '✂️'}
                print(f"  You: {emoji_map[player]}  Computer: {emoji_map[computer]}")
                if outcome == 'win':
                    print("  ✅ You win!")
                elif outcome == 'loss':
                    print("  ❌ You lose!")
                else:
                    print("  🤝 It's a tie!")
        
        print(f"\n📊 Final Stats: {game.get_stats()}")
    
    elif choice == '4':
        print("Thanks for playing! 👋")
        return
    
    else:
        print("Invalid choice!")


if __name__ == "__main__":
    main()
