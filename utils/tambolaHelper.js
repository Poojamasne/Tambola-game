const generateNumber = (drawnNumbers) => {
    const availableNumbers = Array.from({ length: 90 }, (_, i) => i + 1).filter(
        (num) => !drawnNumbers.includes(num)
    );

    if (availableNumbers.length === 0) return null; // No numbers left

    const randomIndex = Math.floor(Math.random() * availableNumbers.length);
    return availableNumbers[randomIndex];
};

module.exports = { generateNumber };
