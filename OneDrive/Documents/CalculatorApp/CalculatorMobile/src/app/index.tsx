import * as Clipboard from 'expo-clipboard';
import { useState } from 'react';
import {
  Alert,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';

type Calculation = { expression: string; result: string };

const COLORS = {
  lime: '#DFFF38',
  paper: '#FFFDF5',
  ink: '#24251F',
  muted: '#85877D',
  button: '#F0F0EA',
  operator: '#E8E9DE',
};

function calculate(source: string): number {
  const tokens = source.match(/(?:\d+\.?\d*|\.\d+)|[()+\-*/%]/g) ?? [];
  if (tokens.join('') !== source.replace(/\s/g, '') || tokens.length === 0) {
    throw new Error('Invalid expression');
  }

  let index = 0;
  const parseExpression = (): number => {
    let value = parseTerm();
    while (tokens[index] === '+' || tokens[index] === '-') {
      const operator = tokens[index++];
      const right = parseTerm();
      value = operator === '+' ? value + right : value - right;
    }
    return value;
  };
  const parseTerm = (): number => {
    let value = parseFactor();
    while (tokens[index] === '*' || tokens[index] === '/') {
      const operator = tokens[index++];
      const right = parseFactor();
      if (operator === '/' && right === 0) throw new Error('Cannot divide by zero');
      value = operator === '*' ? value * right : value / right;
    }
    return value;
  };
  const parseFactor = (): number => {
    if (tokens[index] === '+') {
      index += 1;
      return parseFactor();
    }
    if (tokens[index] === '-') {
      index += 1;
      return -parseFactor();
    }

    let value: number;
    if (tokens[index] === '(') {
      index += 1;
      value = parseExpression();
      if (tokens[index] !== ')') throw new Error('Unclosed parenthesis');
      index += 1;
    } else {
      const token = tokens[index++];
      if (!token || !/^\d*\.?\d+$/.test(token)) throw new Error('Expected a number');
      value = Number(token);
    }
    while (tokens[index] === '%') {
      value /= 100;
      index += 1;
    }
    return value;
  };

  const result = parseExpression();
  if (index !== tokens.length || !Number.isFinite(result)) throw new Error('Invalid result');
  return result;
}

function formatResult(value: number): string {
  return Number(value.toPrecision(10)).toString();
}

export default function HomeScreen() {
  const { height } = useWindowDimensions();
  const compact = height < 720;
  const [expression, setExpression] = useState('');
  const [completedExpression, setCompletedExpression] = useState('');
  const [justCalculated, setJustCalculated] = useState(false);
  const [history, setHistory] = useState<Calculation[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [copied, setCopied] = useState(false);

  const normalized = expression.replace(/÷/g, '/').replace(/[×]/g, '*').replace(/−/g, '-');
  let preview = '0';
  if (expression) {
    try {
      preview = formatResult(calculate(normalized));
    } catch {
      preview = justCalculated ? expression : ' ';
    }
  }

  const pressKey = (key: string) => {
    setCopied(false);
    if (key === 'C') {
      setExpression('');
      setCompletedExpression('');
      setJustCalculated(false);
      return;
    }
    if (key === 'DEL') {
      setExpression((current) => current.slice(0, -1));
      setJustCalculated(false);
      return;
    }
    if (key === '()') {
      setExpression((current) => {
        const opens = (current.match(/\(/g) ?? []).length;
        const closes = (current.match(/\)/g) ?? []).length;
        const last = current.slice(-1);
        const shouldClose = opens > closes && /[\d)%]/.test(last);
        const next = shouldClose ? ')' : '(';
        return justCalculated ? next : current + next;
      });
      setJustCalculated(false);
      return;
    }
    if (key === '=') {
      try {
        const result = formatResult(calculate(normalized));
        if (expression.trim()) {
          setHistory((items) => [{ expression, result }, ...items].slice(0, 30));
          setCompletedExpression(expression);
          setExpression(result);
          setJustCalculated(true);
        }
      } catch {
        Alert.alert('Cannot calculate', 'Check the expression and try again.');
      }
      return;
    }
    setExpression((current) => {
      const startsNew = justCalculated && /[\d.]/.test(key);
      const base = justCalculated && !startsNew ? current : justCalculated ? '' : current;
      if (key === '.') {
        const currentNumber = base.split(/[+−×÷()%]/).pop() ?? '';
        if (currentNumber.includes('.')) return base;
        return currentNumber ? `${base}.` : `${base}0.`;
      }
      if (/[+−×÷]/.test(key) && /[+−×÷]$/.test(base)) return `${base.slice(0, -1)}${key}`;
      return base + key;
    });
    setJustCalculated(false);
  };

  const copyResult = async () => {
    const value = justCalculated ? expression : preview;
    if (!value.trim()) return;
    try {
      await Clipboard.setStringAsync(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    } catch {
      Alert.alert('Copy unavailable', 'The result could not be copied.');
    }
  };

  const keys = [
    ['C', '()', '%', '÷'],
    ['7', '8', '9', '×'],
    ['4', '5', '6', '−'],
    ['1', '2', '3', '+'],
    ['0', '.', '='],
  ];

  return (
    <SafeAreaView style={styles.screen}>
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        <View style={[styles.patternRing, styles.ringOne]} />
        <View style={[styles.patternRing, styles.ringTwo]} />
        <View style={[styles.patternDiamond, styles.diamondOne]} />
        <View style={[styles.patternDiamond, styles.diamondTwo]} />
        <View style={[styles.patternDot, styles.dotOne]} />
        <View style={[styles.patternDot, styles.dotTwo]} />
      </View>

      <View style={styles.frame}>
        <View style={[styles.calculator, compact && styles.calculatorCompact]}>
          <View style={styles.topline}>
            <Text style={styles.brand}>MINT / 01</Text>
            <View style={styles.tools}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Calculation history"
                onPress={() => setShowHistory(true)}
                style={styles.toolButton}>
                <Text style={styles.toolIcon}>↺</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Copy result"
                onPress={copyResult}
                style={styles.toolButton}>
                <Text style={styles.toolIcon}>{copied ? '✓' : '▢'}</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Delete last character"
                onPress={() => pressKey('DEL')}
                style={styles.toolButton}>
                <Text style={styles.toolIcon}>⌫</Text>
              </Pressable>
            </View>
          </View>

          <View style={[styles.display, compact && styles.displayCompact]}>
            <Text numberOfLines={1} adjustsFontSizeToFit style={styles.expression}>
              {justCalculated ? completedExpression : expression || ' '}
            </Text>
            <Text numberOfLines={1} adjustsFontSizeToFit style={[styles.result, compact && styles.resultCompact]}>
              {justCalculated ? expression : preview}
            </Text>
          </View>

          <View style={styles.keypad}>
            {keys.map((row, rowIndex) => (
              <View key={`row-${rowIndex}`} style={styles.keyRow}>
                {row.map((key) => {
                  const isOperator = ['÷', '×', '−', '+', '%', '()'].includes(key);
                  const isDark = key === 'C' || key === '=';
                  return (
                    <Pressable
                      key={key}
                      accessibilityRole="button"
                      accessibilityLabel={key === 'DEL' ? 'Delete' : key}
                      onPress={() => pressKey(key)}
                      style={({ pressed }) => [
                        styles.key,
                        key === '0' && styles.zeroKey,
                        isOperator && styles.operatorKey,
                        isDark && styles.darkKey,
                        pressed && styles.keyPressed,
                      ]}>
                      <Text style={[styles.keyText, isOperator && styles.operatorText, isDark && styles.darkText]}>
                        {key}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            ))}
          </View>
        </View>
      </View>

      {showHistory && (
        <View style={styles.historyOverlay}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close history"
            onPress={() => setShowHistory(false)}
            style={styles.historyScrim}
          />
          <View style={styles.historyPanel}>
            <View style={styles.historyHeader}>
              <Text style={styles.historyTitle}>History</Text>
              <Pressable accessibilityRole="button" onPress={() => setShowHistory(false)} hitSlop={12}>
                <Text style={styles.closeButton}>×</Text>
              </Pressable>
            </View>
            {history.length === 0 ? (
              <Text style={styles.emptyHistory}>Your calculations will appear here.</Text>
            ) : (
              <ScrollView contentContainerStyle={styles.historyList}>
                {history.map((item, index) => (
                  <Pressable
                    key={`${item.expression}-${index}`}
                    accessibilityRole="button"
                    onPress={() => {
                      setExpression(item.result);
                      setCompletedExpression(item.expression);
                      setJustCalculated(true);
                      setShowHistory(false);
                    }}
                    style={styles.historyItem}>
                    <Text numberOfLines={1} style={styles.historyExpression}>{item.expression}</Text>
                    <Text style={styles.historyResult}>{item.result}</Text>
                  </Pressable>
                ))}
              </ScrollView>
            )}
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.lime,
  },
  frame: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  calculator: {
    width: '100%',
    maxWidth: 430,
    flex: 1,
    maxHeight: 760,
    backgroundColor: COLORS.paper,
    borderRadius: 30,
    padding: 22,
    shadowColor: '#596019',
    shadowOffset: { width: 0, height: 15 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 9,
  },
  calculatorCompact: {
    borderRadius: 25,
    padding: 16,
  },
  topline: {
    height: 38,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brand: {
    color: COLORS.muted,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.4,
  },
  tools: {
    flexDirection: 'row',
    gap: 8,
  },
  toolButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: COLORS.button,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toolIcon: {
    color: COLORS.ink,
    fontSize: 18,
    fontWeight: '600',
  },
  display: {
    flex: 1,
    minHeight: 115,
    justifyContent: 'flex-end',
    alignItems: 'flex-end',
    paddingBottom: 20,
    paddingTop: 12,
  },
  displayCompact: {
    minHeight: 82,
    paddingBottom: 13,
  },
  expression: {
    color: COLORS.muted,
    fontSize: 20,
    fontWeight: '500',
    maxWidth: '100%',
  },
  result: {
    marginTop: 5,
    color: COLORS.ink,
    fontSize: 54,
    fontWeight: '600',
    maxWidth: '100%',
    fontVariant: ['tabular-nums'],
  },
  resultCompact: {
    fontSize: 44,
  },
  keypad: {
    flex: 2.1,
    gap: 10,
  },
  keyRow: {
    flex: 1,
    flexDirection: 'row',
    gap: 10,
  },
  key: {
    flex: 1,
    minWidth: 0,
    minHeight: 42,
    borderRadius: 18,
    backgroundColor: COLORS.button,
    alignItems: 'center',
    justifyContent: 'center',
  },
  zeroKey: {
    flex: 2,
  },
  operatorKey: {
    backgroundColor: COLORS.operator,
  },
  darkKey: {
    backgroundColor: COLORS.ink,
  },
  keyPressed: {
    opacity: 0.68,
    transform: [{ scale: 0.97 }],
  },
  keyText: {
    color: COLORS.ink,
    fontSize: 25,
    fontWeight: '500',
  },
  operatorText: {
    fontSize: 23,
    fontWeight: '600',
  },
  darkText: {
    color: COLORS.lime,
    fontWeight: '700',
  },
  patternRing: {
    position: 'absolute',
    borderColor: 'rgba(66, 78, 15, 0.10)',
    borderWidth: 1,
    borderRadius: 999,
  },
  ringOne: {
    width: 260,
    height: 260,
    top: -110,
    right: -80,
  },
  ringTwo: {
    width: 390,
    height: 390,
    top: -175,
    right: -145,
  },
  patternDiamond: {
    position: 'absolute',
    width: 36,
    height: 36,
    borderWidth: 1,
    borderColor: 'rgba(66, 78, 15, 0.15)',
    transform: [{ rotate: '45deg' }],
  },
  diamondOne: {
    left: 30,
    top: '18%',
  },
  diamondTwo: {
    right: 35,
    bottom: '14%',
    width: 24,
    height: 24,
  },
  patternDot: {
    position: 'absolute',
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: 'rgba(66, 78, 15, 0.25)',
  },
  dotOne: {
    right: '16%',
    top: '27%',
  },
  dotTwo: {
    left: '13%',
    bottom: '24%',
  },
  historyOverlay: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'flex-end',
  },
  historyScrim: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(27, 29, 20, 0.38)',
  },
  historyPanel: {
    maxHeight: '75%',
    minHeight: 240,
    backgroundColor: COLORS.paper,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    paddingHorizontal: 24,
    paddingTop: 22,
    paddingBottom: 30,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  historyTitle: {
    color: COLORS.ink,
    fontSize: 22,
    fontWeight: '700',
  },
  closeButton: {
    color: COLORS.ink,
    fontSize: 30,
    lineHeight: 32,
  },
  emptyHistory: {
    color: COLORS.muted,
    fontSize: 15,
    paddingVertical: 24,
  },
  historyList: {
    gap: 4,
    paddingBottom: 12,
  },
  historyItem: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#DADBD2',
    paddingVertical: 13,
    gap: 4,
  },
  historyExpression: {
    color: COLORS.muted,
    fontSize: 14,
    textAlign: 'right',
  },
  historyResult: {
    color: COLORS.ink,
    fontSize: 21,
    fontWeight: '600',
    textAlign: 'right',
  },
});
