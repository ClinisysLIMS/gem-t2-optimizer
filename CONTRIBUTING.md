# Contributing to GEM T2 Controller Optimizer

🎉 Thank you for your interest in contributing to the GEM T2 Controller Optimizer! This project is community-driven and we welcome contributions of all kinds.

## 📋 Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [How to Contribute](#how-to-contribute)
- [Development Setup](#development-setup)
- [Style Guidelines](#style-guidelines)
- [Testing](#testing)
- [Submitting Changes](#submitting-changes)
- [Reporting Issues](#reporting-issues)
- [Feature Requests](#feature-requests)

## Code of Conduct

This project follows a simple code of conduct: **Be respectful, be constructive, and be helpful.** We're all here to make GEM vehicles better and safer.

### Our Standards

- Use welcoming and inclusive language
- Be respectful of differing viewpoints and experiences
- Gracefully accept constructive criticism
- Focus on what is best for the community
- Show empathy towards other community members

## Getting Started

### Prerequisites

- **Git**: For version control
- **Modern Web Browser**: Chrome, Firefox, Safari, or Edge
- **Text Editor**: VS Code, Sublime Text, or your preferred editor
- **Node.js** (optional): For backend development and testing
- **Basic Knowledge**: HTML, CSS, JavaScript

### First Contribution

1. **Fork the repository** on GitHub
2. **Clone your fork** locally:
   ```bash
   git clone https://github.com/YOUR_USERNAME/gem-t2-optimizer.git
   cd gem-t2-optimizer
   ```
3. **Create a branch** for your contribution:
   ```bash
   git checkout -b feature/your-feature-name
   ```
4. **Make your changes** and test thoroughly
5. **Submit a pull request**

## How to Contribute

### Types of Contributions Welcome

#### 🐛 Bug Fixes
- Fix issues in controller calculations
- Resolve UI/UX problems
- Correct documentation errors
- Fix PDF parsing issues

#### ✨ Feature Enhancements
- New optimization presets
- Additional PDF format support
- UI/UX improvements
- Mobile responsiveness
- Performance optimizations

#### 📚 Documentation
- Improve README or guides
- Add code comments
- Create tutorials
- Document new features

#### 🧪 Testing
- Add test cases
- Test on different browsers
- Test with various GEM models
- Performance testing

#### 🎨 Design
- UI/UX improvements
- Better responsive design
- Accessibility enhancements
- Visual design updates

## Development Setup

### Quick Setup
```bash
# Clone the repository
git clone https://github.com/YOUR_USERNAME/gem-t2-optimizer.git
cd gem-t2-optimizer

# For static development, just open index.html
# For local server (recommended):
python -m http.server 8000
# Visit http://localhost:8000
```

### Backend Development (Optional)
```bash
# Setup backend
cd backend
npm install
cp .env.example .env
# Edit .env file with your settings
npm start
```

### MCP Server Development (Optional)
```bash
# Setup MCP server
cd mcp-server
npm install
npm run build
npm start
```

### Project Structure
```
gem-t2-optimizer/
├── js/                     # Core JavaScript modules
│   ├── optimizer.js        # Main optimization engine
│   ├── presets.js         # Configuration presets
│   ├── trip-planner.js    # Trip planning functionality
│   ├── pdf-parser.js      # PDF import functionality
│   └── ...
├── backend/               # Optional backend services
├── mcp-server/           # MCP integration server
├── docs/                 # Documentation
└── tests/                # Test files
```

## Style Guidelines

### JavaScript
- **ES6+**: Use modern JavaScript features
- **Semicolons**: Always use semicolons
- **Naming**: Use camelCase for variables and functions
- **Classes**: Use PascalCase for class names
- **Constants**: Use UPPER_SNAKE_CASE for constants

```javascript
// Good
class TripPlanner {
    constructor() {
        this.weatherService = new WeatherService();
    }
    
    async planTrip(destination, date) {
        // Implementation
    }
}

const MAX_SPEED = 25;
```

### HTML
- **Semantic HTML**: Use appropriate HTML5 elements
- **Accessibility**: Include proper ARIA labels and alt text
- **Indentation**: Use 4 spaces for indentation
- **Classes**: Use kebab-case for CSS classes

```html
<!-- Good -->
<section class="trip-planner" role="main">
    <h2 class="section-title">Plan Your Trip</h2>
    <form class="trip-form" aria-label="Trip planning form">
        <!-- Form content -->
    </form>
</section>
```

### CSS
- **Tailwind First**: Use Tailwind CSS classes when possible
- **Custom CSS**: Only add custom CSS when necessary
- **Mobile First**: Write responsive styles mobile-first
- **Comments**: Comment complex styles

```css
/* Custom styles for specific components */
.trip-planner {
    /* Mobile first */
    padding: 1rem;
}

@media (min-width: 768px) {
    .trip-planner {
        padding: 2rem;
    }
}
```

### Documentation
- **JSDoc**: Use JSDoc comments for functions and classes
- **README**: Update README for new features
- **Inline Comments**: Explain complex logic

```javascript
/**
 * Calculate optimal controller settings for given conditions
 * @param {Object} vehicleData - Vehicle specifications
 * @param {Object} conditions - Environmental conditions
 * @returns {Object} Optimized controller settings
 */
function optimizeSettings(vehicleData, conditions) {
    // Implementation
}
```

## Testing

### Manual Testing
- **Cross-browser**: Test in Chrome, Firefox, Safari, Edge
- **Responsive**: Test on mobile, tablet, desktop
- **Functionality**: Test all features thoroughly
- **Edge Cases**: Test with invalid inputs and edge cases

### Browser Compatibility
- **Modern Browsers**: Chrome 80+, Firefox 75+, Safari 13+, Edge 80+
- **Mobile**: iOS Safari 13+, Chrome Mobile 80+
- **Features**: ES6, Fetch API, Local Storage, Web Workers

### PDF Testing
- Test with various PDF formats:
  - Sentry software exports
  - Optimization comparison documents
  - Custom formats
  - Corrupted/invalid files

## Submitting Changes

### Pull Request Process

1. **Update Documentation**: Update README if needed
2. **Test Thoroughly**: Ensure all features work correctly
3. **Clean Commits**: Use clear, descriptive commit messages
4. **Fill Template**: Use the pull request template
5. **Request Review**: Tag relevant maintainers

### Commit Message Format
```
type(scope): brief description

Longer description if needed

Fixes #123
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes
- `refactor`: Code refactoring
- `test`: Adding tests
- `chore`: Maintenance tasks

**Examples:**
```bash
feat(trip-planner): add weather integration for trip optimization
fix(pdf-parser): handle malformed function numbers correctly
docs(readme): update installation instructions
```

### Pull Request Checklist

- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Comments added for complex code
- [ ] Documentation updated
- [ ] Manual testing completed
- [ ] No console errors
- [ ] Responsive design tested
- [ ] Accessibility considered

## Reporting Issues

### Bug Reports

Use the bug report template and include:

- **Description**: Clear description of the issue
- **Steps to Reproduce**: Exact steps to trigger the bug
- **Expected Behavior**: What should happen
- **Actual Behavior**: What actually happens
- **Environment**: Browser, OS, device
- **Screenshots**: If applicable
- **Console Errors**: Any JavaScript errors

### Security Issues

For security vulnerabilities:
1. **Do NOT** create a public issue
2. **Email**: [security contact - to be added]
3. **Include**: Detailed description and reproduction steps

## Feature Requests

### Before Requesting
- Check existing issues and discussions
- Consider if it fits the project scope
- Think about implementation complexity

### Request Format
- **Use Case**: Why is this needed?
- **Proposed Solution**: How should it work?
- **Alternatives**: Other ways to solve this
- **Additional Context**: Screenshots, mockups, etc.

## Development Tips

### Debugging
- Use browser developer tools
- Check console for errors
- Test with various PDF files
- Validate API responses

### Performance
- Test with large PDF files
- Monitor memory usage
- Optimize API calls
- Use browser caching effectively

### API Integration
- Test with real API keys
- Handle rate limits gracefully
- Provide fallback data
- Cache responses appropriately

## Community

### Getting Help
- **Discussions**: Use GitHub Discussions for questions
- **Issues**: Use GitHub Issues for bugs and features
- **Code Review**: Participate in pull request reviews

### Recognition
- Contributors will be listed in the README
- Significant contributions may earn maintainer status
- All contributions are appreciated!

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

**Thank you for contributing to make GEM vehicles better! 🚗⚡**