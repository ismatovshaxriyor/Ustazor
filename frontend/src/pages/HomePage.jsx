import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { MapPin, Search } from 'lucide-react';
import { masters } from '../data/mockData';

const quickCategories = ['Santexnik', 'Elektrik', 'Malyar', 'Quruvchi', 'Mebelchi'];

function HomePage() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [city, setCity] = useState('all');

  const cityOptions = useMemo(
    () => ['all', ...new Set(masters.map((master) => master.city))],
    [],
  );

  const onSearch = (event) => {
    event.preventDefault();
    const params = new URLSearchParams();

    if (query.trim()) {
      params.set('q', query.trim());
    }

    if (city !== 'all') {
      params.set('city', city);
    }

    const queryString = params.toString();
    navigate(queryString ? `/masters?${queryString}` : '/masters');
  };

  return (
    <section className="home-hero">
      <div className="home-hero-content">
        <p className="hero-status-badge">
          <span className="hero-status-dot" />
          1,200+ TEKSHIRILGAN USTA TAYYOR
        </p>

        <h1 className="home-hero-title">
          O'z Ishining
          <span> Ustalarini</span>
          <br />
          Shu Yerdan Toping
        </h1>

        <p className="home-hero-subtitle">
          Ishonchli va tajribali ustalar - bir qadam uzoqda. O'zbekistonning har bir hududida.
        </p>

        <form className="home-search-bar" onSubmit={onSearch}>
          <label className="home-search-field">
            <Search size={18} />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Qaysi usta kerak? (Masalan, santexnik)"
            />
          </label>

          <label className="home-search-field">
            <MapPin size={18} />
            <select value={city} onChange={(event) => setCity(event.target.value)}>
              {cityOptions.map((item) => (
                <option key={item} value={item}>
                  {item === 'all' ? 'Shahar yoki hudud' : item}
                </option>
              ))}
            </select>
          </label>

          <button className="button button-primary home-search-btn" type="submit">
            Qidirish
          </button>
        </form>

        <div className="hero-chip-row">
          {quickCategories.map((category) => (
            <Link key={category} to={`/masters?q=${encodeURIComponent(category)}`} className="hero-chip-link">
              {category}
            </Link>
          ))}
        </div>

      </div>
    </section>
  );
}

export default HomePage;
