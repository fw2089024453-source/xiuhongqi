module.exports = {
    env: {
        browser: true,
        es2021: true,
        node: true
    },
    extends: [
        'eslint:recommended'
    ],
    parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module'
    },
    rules: {
        // 代码风格
        'indent': ['error', 4, { 'SwitchCase': 1 }],
        'linebreak-style': ['error', 'unix'],
        'quotes': ['error', 'single'],
        'semi': ['error', 'always'],
        
        // 最佳实践
        'eqeqeq': 'error',
        'curly': 'error',
        'no-console': 'warn',
        'no-unused-vars': ['warn', { 
            'args': 'none', 
            'ignoreRestSiblings': true 
        }],
        
        // 变量声明
        'no-var': 'error',
        'prefer-const': ['error', {
            'destructuring': 'any',
            'ignoreReadBeforeAssign': false
        }],
        
        // 对象和数组
        'object-curly-spacing': ['error', 'always'],
        'array-bracket-spacing': ['error', 'never'],
        
        // 箭头函数
        'arrow-spacing': ['error', { 
            'before': true, 
            'after': true 
        }],
        
        // 模板字符串
        'template-curly-spacing': 'error',
        
        // 禁用严格模式（模块中自动启用）
        'strict': 'off'
    },
    overrides: [
        {
            files: ['**/*.test.js', '**/*.spec.js'],
            env: {
                jest: true
            }
        },
        {
            files: ['server/**/*.js'],
            env: {
                node: true
            }
        }
    ]
};