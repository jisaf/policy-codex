import sys
t=open('cw_items.txt').read().split('=== ')[1:]
want=set(sys.argv[1:])
for b in t:
  if b.split('\n')[0].split(' ')[1] in want: print('=== '+b[:4000])
